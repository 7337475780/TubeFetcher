import { NextRequest } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return new Response("Missing YouTube URL", { status: 400 });
    }

    const ytDlpPath = "yt-dlp";

    // Get full video info in JSON
    const { stdout } = await execAsync(
      `"${ytDlpPath}" -J --no-playlist "${url}"`
    );

    const info = JSON.parse(stdout);
    const { title, thumbnail, duration, formats } = info;

    // Keep only audio-only formats
    const audioFormats = formats
      .filter((f: any) => f.vcodec === "none")
      .map((f: any) => ({
        format_id: f.format_id,
        resolution: "audio only",
        ext: f.ext,
        filesize: f.filesize || f.filesize_approx || null,
        acodec: f.acodec,
        abr: f.abr || null,
      }));

    const videoFormats = formats
      .filter(
        (f: any) => f.vcodec !== "none" && (!f.acodec || f.acodec === "none")
      )
      .map((f: any) => ({
        format_id: f.format_id,
        resolution: f.format_note || f.resolution || `${f.height}p`,
        ext: f.ext,
        filesize: f.filesize || f.filesize_approx || null,
        vcodec: f.vcodec,
      }));

    const bothFormats = formats
      .filter(
        (f: any) => f.vcodec !== "none" && f.acodec && f.acodec !== "none"
      )
      .map((f: any) => ({
        format_id: f.format_id,
        resolution: f.format_note || f.resolution || `${f.height}p`,
        ext: f.ext,
        filesize: f.filesize || f.filesize_approx || null,
        vcodec: f.vcodec,
        acodec: f.acodec,
      }));

    return Response.json({
      title,
      thumbnail,
      duration,
      formats: {
        audio: audioFormats,
        video: videoFormats,
        both: bothFormats,
      },
    });
  } catch (err: any) {
    console.error("Info fetch error:", err.message);
    return new Response("Failed to fetch audio info", { status: 500 });
  }
}
