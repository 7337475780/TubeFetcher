import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { RuntimeDetector } from "../../../lib/downloader/RuntimeDetector";
import { CookieManager } from "../../../lib/downloader/CookieManager";
import { DownloaderService } from "../../../lib/downloader/DownloaderService";
import { MetadataCache } from "../../../lib/downloader/MetadataCache";
import { DownloadQueue } from "../../../lib/downloader/DownloadQueue";

export async function GET() {
  let ytDlpVersion = "Not found or not executable";
  try {
    const ytdlpPath = DownloaderService.getYtDlpPath();
    ytDlpVersion = execSync(`"${ytdlpPath}" --version`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    // Ignore
  }

  const runtime = RuntimeDetector.getFormattedRuntime() || "None";

  let ffmpegInstalled = false;
  try {
    execSync("ffmpeg -version", { stdio: ["ignore", "pipe", "ignore"] });
    ffmpegInstalled = true;
  } catch {
    // Ignore
  }

  const cookiesDiag = CookieManager.getDetailedDiagnostics();
  const cookiesLoaded = cookiesDiag.validationPassed;

  return NextResponse.json(
    {
      ytDlpVersion,
      ffmpegInstalled,
      runtime,
      cookiesLoaded,
      queueLength: DownloadQueue.getQueueLength(),
      activeDownloads: DownloadQueue.getActiveCount(),
      cacheEntries: MetadataCache.getCacheCount(),
      uptime: process.uptime(),
      ...cookiesDiag,
    },
    { status: 200 }
  );
}
