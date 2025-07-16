import { NextRequest } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";

const execAsync = promisify(exec);
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

    const ytDlpPath =
      process.platform === "win32"
        ? path.resolve(process.cwd(), "yt-dlp.exe")
        : "yt-dlp";

    let formatString = "";
    if (downloadMode === "audio") {
      formatString = audioFormatId;
    } else if (downloadMode === "video") {
      formatString = videoFormatId;
    } else {
      formatString = `${videoFormatId}+${audioFormatId}`;
    }

    const cmd = `"${ytDlpPath}" --no-playlist -f "${formatString}" -o "${outputTemplate}" ${
      downloadMode !== "audio" ? "--merge-output-format mp4" : ""
    } "${url}"`;

    console.log("Running yt-dlp command:", cmd);
    await execAsync(cmd);

    const files = fs.readdirSync(tempDir);
    let filePath = path.join(tempDir, files[0]);
    let contentType = "video/mp4";

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
        "Content-Disposition": `attachment; filename="video.${
          downloadMode === "audio" ? "mp3" : "mp4"
        }"`,
        "Content-Length": stat.size.toString(),
      },
    });
  } catch (err: any) {
    console.error("Download error:", err.message);
    return new Response("Failed to download", { status: 500 });
  } finally {
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
