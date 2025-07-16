import { NextRequest } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return new Response("Missing YouTube URL", { status: 400 });
    }

    const ytDlpPath =
      process.platform === "win32"
        ? path.resolve(process.cwd(), "yt-dlp.exe")
        : "yt-dlp";

    const { stdout } = await execAsync(
      `"${ytDlpPath}" -J --no-playlist "${url}"`
    );

    const info = JSON.parse(stdout);
    const { title, thumbnail, duration, formats } = info;

    // Filter + map formats
    const cleanedFormats = formats
      .filter((f: any) => f.filesize || f.filesize_approx)
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
      }));

    return Response.json({
      title,
      thumbnail,
      duration,
      formats: cleanedFormats,
    });
  } catch (err: any) {
    console.error("Info fetch error:", err.message);
    return new Response("Failed to fetch video info", { status: 500 });
  }
}
