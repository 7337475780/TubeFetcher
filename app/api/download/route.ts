import { NextRequest, NextResponse } from "next/server";
import { DownloaderService } from "../../../lib/downloader/DownloaderService";
import { DownloaderError } from "../../../lib/downloader/DownloaderError";
import { RateLimiter } from "../../../lib/downloader/RateLimiter";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    if (!RateLimiter.checkLimit(ip, "download")) {
      return NextResponse.json(
        { success: false, code: "RATE_LIMITED", message: "API rate limit exceeded (10 req/min). Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { url, downloadMode, formatId, videoFormatId, audioFormatId } = body;

    if (!url || !downloadMode) {
      return NextResponse.json({ success: false, code: "BAD_REQUEST", message: "Missing URL or downloadMode" }, { status: 400 });
    }

    const result = await DownloaderService.download({
      url,
      downloadMode,
      formatId,
      videoFormatId,
      audioFormatId,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
    };

    if (result.contentLength !== undefined) {
      headers["Content-Length"] = result.contentLength.toString();
    }

    req.signal.addEventListener("abort", () => {
      if (result.stream) {
        try { result.stream.cancel(); } catch { /* Ignore */ }
      }
    });

    return new Response(result.stream, { headers });
  } catch (err: unknown) {
    if (err instanceof DownloaderError) {
      const status = err.code === "RATE_LIMITED" ? 429 : 400;
      return NextResponse.json({ success: false, code: err.code, message: err.message }, { status });
    }
    const message = err instanceof Error ? err.message : "Failed to download video";
    return NextResponse.json({ success: false, code: "UNKNOWN", message }, { status: 500 });
  }
}
