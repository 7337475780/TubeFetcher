import { NextRequest } from "next/server";
import { spawn } from "child_process";
import { Readable } from "stream";

type DownloadMode = "audio" | "video" | "both";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, downloadMode, formatId, videoFormatId, audioFormatId } = body;

    if (!url) return new Response("Missing URL", { status: 400 });

    let args: string[] = ["-f"];

    if (downloadMode === "audio") {
      if (!formatId)
        return new Response("Missing audio format", { status: 400 });
      args.push(formatId, "-x", "--audio-format", "mp3", "--stdout");
    } else if (downloadMode === "video") {
      if (!formatId)
        return new Response("Missing video format", { status: 400 });
      args.push(formatId, "-o", "-", "--no-playlist");
    } else if (downloadMode === "both") {
      if (!videoFormatId || !audioFormatId)
        return new Response("Missing video or audio format", { status: 400 });
      args.push(
        `${videoFormatId}+${audioFormatId}`,
        "-o",
        "-",
        "--no-playlist"
      );
    }

    args.push(url);

    // Spawn yt-dlp
    const ytProcess = spawn("yt-dlp", args);

    // Convert Node Readable to Web ReadableStream
    const stream = new ReadableStream({
      start(controller) {
        ytProcess.stdout.on("data", (chunk) => {
          controller.enqueue(chunk);
        });
        ytProcess.stdout.on("end", () => controller.close());
        ytProcess.stderr.on("data", (chunk) => {
          console.error("yt-dlp error:", chunk.toString());
        });
        ytProcess.on("error", (err) => controller.error(err));
      },
    });

    const filename = downloadMode === "audio" ? "audio.mp3" : "video.mp4";

    return new Response(stream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("Download error:", err);
    return new Response("Failed to download video", { status: 500 });
  }
}
