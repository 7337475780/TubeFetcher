import { NextRequest } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";
import shellQuote from "shell-quote";
const escape = shellQuote.quote;

const execAsync = promisify(exec);

// Always use Linux-compatible binary (installed via pip in Docker)
const ytDlpPath = "yt-dlp";

export async function POST(req: NextRequest) {
  try {
    const { url, videoFormatId, audioFormatId, downloadMode } =
      await req.json();

    if (!url || !downloadMode) {
      return new Response("Missing data", { status: 400 });
    }

    const tempDir = path.join(os.tmpdir(), `yt-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const outputTemplate = path.join(tempDir, "output.%(ext)s");

    let formatString = "";

    if (downloadMode === "audio") {
      // audio only
      formatString = audioFormatId;
    } else if (downloadMode === "video") {
      // if you want merged video+audio for video mode, do video+audio,
      // otherwise just videoFormatId for pure video (no audio)
      if (audioFormatId) {
        formatString = `${videoFormatId}+${audioFormatId}`;
      } else {
        formatString = videoFormatId;
      }
    } else {
      // both mode: video+audio merged
      formatString = `${videoFormatId}+${audioFormatId}`;
    }

    // Then use formatString in command:
    const cmd = `${ytDlpPath} --no-playlist -f ${escape([
      formatString,
    ])} -o "${outputTemplate}" ${
      downloadMode !== "audio" ? "--merge-output-format mp4" : ""
    } ${escape([url])}`;

    console.log("Running yt-dlp command:", cmd);
    await execAsync(cmd);

    // Read downloaded file
    const files = fs.readdirSync(tempDir);
    if (files.length === 0) throw new Error("No output file found.");

    let filePath = path.join(tempDir, files[0]);
    let contentType = "video/mp4";

    // Convert to mp3 if audio-only
    if (downloadMode === "audio") {
      const mp3Path = path.join(tempDir, "converted.mp3");
      await execAsync(`ffmpeg -y -i "${filePath}" -b:a 192k -vn "${mp3Path}"`);
      filePath = mp3Path;
      contentType = "audio/mpeg";
    }

    const stat = fs.statSync(filePath);
    const buffer = fs.readFileSync(filePath);

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="download.${
          downloadMode === "audio" ? "mp3" : "mp4"
        }"`,
        "Content-Length": stat.size.toString(),
      },
    });
  } catch (err: any) {
    console.error("Download error:", err.message);
    return new Response("Failed to download", { status: 500 });
  } finally {
    // Cleanup temp files after 15 seconds
    setTimeout(() => {
      try {
        const dirs = fs
          .readdirSync(os.tmpdir())
          .filter((f) => f.startsWith("yt-"));
        for (const dir of dirs) {
          fs.rmSync(path.join(os.tmpdir(), dir), {
            recursive: true,
            force: true,
          });
        }
      } catch (e) {
        console.warn("Cleanup failed:", e);
      }
    }, 15000);
  }
}
