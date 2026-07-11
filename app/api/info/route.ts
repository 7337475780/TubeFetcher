import { NextRequest, NextResponse } from "next/server";
import { DownloaderService } from "../../../lib/downloader/DownloaderService";
import { DownloaderError } from "../../../lib/downloader/DownloaderError";
import { RateLimiter } from "../../../lib/downloader/RateLimiter";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    if (!RateLimiter.checkLimit(ip, "metadata")) {
      return NextResponse.json(
        { success: false, code: "RATE_LIMITED", message: "API rate limit exceeded (30 req/min). Please try again later." },
        { status: 429 }
      );
    }

    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ success: false, code: "BAD_REQUEST", message: "Missing video URL" }, { status: 400 });
    }

    const info = await DownloaderService.getInfo(url);
    const { title, thumbnail, duration, formats } = info;

    const cleanedFormats = formats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((f: any) => f.filesize || f.filesize_approx)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((f: any) => ({
        format_id: f.format_id,
        resolution: f.vcodec === "none" ? "audio only" : f.format_note || f.resolution || `${f.height}p`,
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
      const status = err.code === "RATE_LIMITED" ? 429 : 400;
      return NextResponse.json(
        { success: false, code: err.code, message: err.message },
        { status }
      );
    }
    const message = err instanceof Error ? err.message : "Failed to fetch video info";
    return NextResponse.json({ success: false, code: "UNKNOWN", message }, { status: 500 });
  }
}
