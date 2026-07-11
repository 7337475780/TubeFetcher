import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { RuntimeDetector } from "../../../lib/downloader/RuntimeDetector";
import { CookieManager } from "../../../lib/downloader/CookieManager";
import { DownloaderService } from "../../../lib/downloader/DownloaderService";

export async function GET() {
  let ytDlp = "✗ Not found or not executable";
  try {
    const ytdlpPath = DownloaderService.getYtDlpPath();
    ytDlp = execSync(`"${ytdlpPath}" --version`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    // Ignore
  }

  const runtime = RuntimeDetector.getFormattedRuntime() || "✗ None";

  let ffmpeg = "✗ Not found";
  try {
    ffmpeg = execSync("ffmpeg -version", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .split("\n")[0]
      .trim();
  } catch {
    // Ignore
  }

  const cookies = CookieManager.getDiagnostics();
  const platform = process.platform;
  const nodeVersion = process.version;

  const hasErrors =
    ytDlp.startsWith("✗") ||
    runtime.startsWith("✗") ||
    ffmpeg.startsWith("✗");

  return NextResponse.json(
    {
      ytDlp,
      runtime,
      ffmpeg,
      cookies,
      platform,
      nodeVersion,
    },
    { status: hasErrors ? 503 : 200 }
  );
}
