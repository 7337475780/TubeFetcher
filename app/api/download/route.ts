import { NextRequest } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { url, formatId, hasAudio } = await req.json();

    if (!url || !formatId) {
      return new Response("Missing URL or format ID", { status: 400 });
    }

    const tempDir = path.join(os.tmpdir(), `yt-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const outputPath = path.join(tempDir, `video.%(ext)s`);
    const formatString = hasAudio
      ? `${formatId}`
      : `${formatId}+bestaudio[ext=m4a]`;

    const ytDlpPath =
      process.platform === "win32"
        ? path.resolve(process.cwd(), "yt-dlp.exe")
        : "yt-dlp";

    const command = `"${ytDlpPath}" --no-playlist -f "${formatString}" -o "${outputPath}" --merge-output-format mp4 "${url}"`;
    await execAsync(command);

    const downloadedFile = fs.readdirSync(tempDir)[0];
    const filePath = path.join(tempDir, downloadedFile);
    const stat = fs.statSync(filePath);
    const stream = fs.createReadStream(filePath);

    return new Response(stream as any, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${downloadedFile}"`,
        "Content-Length": stat.size.toString(),
      },
    });
  } catch (err: any) {
    console.error("Download error:", err.message);
    return new Response("Failed to download video", { status: 500 });
  } finally {
    setTimeout(() => {
      try {
        const folders = fs
          .readdirSync(os.tmpdir())
          .filter((f) => f.startsWith("yt-"));
        for (const folder of folders) {
          const dirPath = path.join(os.tmpdir(), folder);
          fs.rmSync(dirPath, { recursive: true, force: true });
        }
      } catch (e) {
        console.warn("Cleanup failed:", e);
      }
    }, 15000);
  }
}
