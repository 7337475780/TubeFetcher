import { NextRequest } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { url, mode }: { url: string; mode?: "audio" | "video" | "both" } =
      await req.json();

    if (!url) {
      return new Response("Missing YouTube URL", { status: 400 });
    }

    const ytDlpPath =
      process.platform === "win32"
        ? path.resolve(process.cwd(), "yt-dlp.exe")
        : "yt-dlp";

    // Always get full info with all formats
    const { stdout } = await execAsync(
      `"${ytDlpPath}" -J --no-playlist "${url}"`,
      { maxBuffer: 10 * 1024 * 1024 }
    );

    const info = JSON.parse(stdout);
    const { title, thumbnail, duration, formats } = info;

    // Filter formats client-side based on mode
    let filteredFormats = formats.filter(
      (f: any) => f.filesize || f.filesize_approx
    );

    if (mode === "audio") {
      filteredFormats = filteredFormats.filter(
        (f: any) => f.vcodec === "none" && f.acodec && f.acodec !== "none"
      );
    } else if (mode === "video") {
      filteredFormats = filteredFormats.filter((f: any) => f.vcodec !== "none");
    }
    // else mode "both" or undefined = no filtering

    const cleanedFormats = filteredFormats.map((f: any) => ({
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
    console.error("Info fetch error:", err.stderr || err.message);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch video info",
        details: err.message,
      }),
      { status: 500 }
    );
  }
}
