import { NextRequest, NextResponse } from "next/server";
import { DownloaderService } from "../../../lib/downloader/DownloaderService";
import { DownloaderError } from "../../../lib/downloader/DownloaderError";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return new Response("Missing video URL", { status: 400 });
    }

    const info = await DownloaderService.getInfo(url);
    const { title, thumbnail, duration, formats } = info;

    // Clean formats for frontend
    const cleanedFormats = formats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((f: any) => f.filesize || f.filesize_approx)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((f: any) => ({
        format_id: f.format_id,
        resolution:
          f.vcodec === "none"
            ? "audio only"
            : f.format_note || f.resolution || `${f.height}p`,
        ext: f.ext,
        filesize: f.filesize || f.filesize_approx,
        hasAudio: !!f.acodec && f.acodec !== "none",
        vcodec: f.vcodec,
        acodec: f.acodec,
        fps: f.fps,
      }));

    return NextResponse.json({
      title,
      thumbnail,
      duration,
      formats: cleanedFormats,
    });
  } catch (err: unknown) {
    if (err instanceof DownloaderError) {
      return new Response(err.message, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Failed to fetch video info";
    return new Response(message, { status: 500 });
  }
}
