import { NextRequest } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { RuntimeDetector } from "../../../lib/downloader/RuntimeDetector";
import { CookieManager } from "../../../lib/downloader/CookieManager";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return new Response("Missing video URL", { status: 400 });
    }

    const ytDlpPath = process.platform === "win32"
      ? path.join(process.cwd(), "yt-dlp.exe")
      : "/usr/local/bin/yt-dlp";

    // Fetch info in JSON format using shell-safe execFile
    const args = [
      "-J",
      "--no-playlist",
      "--no-check-certificates",
      ...RuntimeDetector.getRuntimeArgs(),
      ...CookieManager.getCookieArgs(),
      url,
    ];

    const { stdout } = await execFileAsync(ytDlpPath, args);

    const info = JSON.parse(stdout);
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

    return Response.json({
      title,
      thumbnail,
      duration,
      formats: cleanedFormats,
    });
  } catch (err) {
    const error = err as Error;
    console.error("Info fetch error:", error.message);
    return new Response("Failed to fetch video info", { status: 500 });
  }
}
