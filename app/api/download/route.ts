import { NextRequest } from "next/server";
import { DownloaderService } from "../../../lib/downloader/DownloaderService";
import { DownloaderError } from "../../../lib/downloader/DownloaderError";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, downloadMode, formatId, videoFormatId, audioFormatId } = body;

    if (!url) return new Response("Missing URL", { status: 400 });
    if (!downloadMode) return new Response("Missing download mode", { status: 400 });

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

    // Set up abort listener to kill spawn if request is closed prematurely
    req.signal.addEventListener("abort", () => {
      if (result.stream) {
        try {
          result.stream.cancel();
        } catch {
          // Ignore
        }
      }
    });

    return new Response(result.stream, {
      headers,
    });
  } catch (err: unknown) {
    if (err instanceof DownloaderError) {
      return new Response(err.message, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Failed to download video";
    return new Response(message, { status: 500 });
  }
}
