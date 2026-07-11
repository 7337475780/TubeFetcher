import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, downloadMode, formatId, videoFormatId, audioFormatId } = body;

    if (!url) return new Response("Missing URL", { status: 400 });

    const args: string[] = ["--js-runtimes=node", "-f"];
    let isTempFile = false;
    let tempPath = "";

    if (downloadMode === "audio") {
      if (!formatId)
        return new Response("Missing audio format", { status: 400 });
      // Download to temp file so ffmpeg can extract audio properly
      isTempFile = true;
      const fs = await import("fs");
      const os = await import("os");
      tempPath = path.join(os.tmpdir(), `yt_dlp_${Date.now()}.mp3`);
      args.push(formatId, "-x", "--audio-format", "mp3", "-o", tempPath, "--no-playlist");
    } else if (downloadMode === "video") {
      if (!formatId)
        return new Response("Missing video format", { status: 400 });
      args.push(formatId, "-o", "-", "--no-playlist");
    } else if (downloadMode === "both") {
      if (!videoFormatId || !audioFormatId)
        return new Response("Missing video or audio format", { status: 400 });
      // Merging requires downloading locally first to avoid ffmpeg connection resets
      isTempFile = true;
      const fs = await import("fs");
      const os = await import("os");
      tempPath = path.join(os.tmpdir(), `yt_dlp_${Date.now()}.mkv`);
      args.push(
        `${videoFormatId}+${audioFormatId}`,
        "-o",
        tempPath,
        "--merge-output-format",
        "mkv",
        "--no-playlist"
      );
    }

    args.push(url);

    const ytDlpPath = process.platform === "win32"
      ? path.join(process.cwd(), "yt-dlp.exe")
      : "yt-dlp";

    const filename = downloadMode === "audio" ? "audio.mp3" : downloadMode === "both" ? "video.mkv" : "video.mp4";

    if (isTempFile) {
      // Wait for yt-dlp to finish downloading to the temp file
      await new Promise<void>((resolve, reject) => {
        const ytProcess = spawn(ytDlpPath, args);
        ytProcess.stderr.on("data", (chunk) => {
          const text = chunk.toString().trim();
          if (
            !text.startsWith("[download]") &&
            !text.startsWith("frame=") &&
            !text.startsWith("size=")
          ) {
             if (text.length > 0) console.error("yt-dlp log:", text);
          }
        });
        ytProcess.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`yt-dlp exited with code ${code}`));
        });
        ytProcess.on("error", reject);
      });

      const fs = await import("fs");
      const stat = fs.statSync(tempPath);
      
      const stream = new ReadableStream({
        start(controller) {
          const fileStream = fs.createReadStream(tempPath);
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => {
            controller.close();
            fs.unlinkSync(tempPath); // Cleanup
          });
          fileStream.on("error", (err) => {
            controller.error(err);
            fs.unlinkSync(tempPath); // Cleanup
          });
        },
        cancel() {
          fs.unlinkSync(tempPath);
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": stat.size.toString(),
        },
      });
    }

    const ytProcess = spawn(ytDlpPath, args);

    // Convert Node Readable to Web ReadableStream
    const stream = new ReadableStream({
      start(controller) {
        let isClosed = false;
        
        req.signal.addEventListener("abort", () => {
          ytProcess.kill();
        });

        ytProcess.stdout.on("data", (chunk) => {
          if (!isClosed) controller.enqueue(chunk);
        });

        ytProcess.on("close", () => {
          if (!isClosed) {
            controller.close();
            isClosed = true;
          }
        });

        // Only log real errors, ignore progress logs and ffmpeg output
        ytProcess.stderr.on("data", (chunk) => {
          const text = chunk.toString().trim();
          if (
            !text.startsWith("[download]") &&
            !text.startsWith("frame=") &&
            !text.startsWith("size=") &&
            !text.includes("fps=") &&
            !text.startsWith("[Merger]") &&
            !text.startsWith("Metadata:") &&
            !text.startsWith("Stream #") &&
            !text.includes("kb/s")
          ) {
             if (text.length > 0) console.error("yt-dlp log:", text);
          }
        });

        ytProcess.on("error", (err) => {
          if (!isClosed) {
            controller.error(err);
            isClosed = true;
          }
        });
      },
      cancel() {
        ytProcess.kill();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Download error:", err);
    return new Response("Failed to download video", { status: 500 });
  }
}
