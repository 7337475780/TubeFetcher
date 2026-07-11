import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { RuntimeDetector } from "../../../lib/downloader/RuntimeDetector";
import path from "path";

export async function GET() {
  const results: Record<string, string> = {};

  // 1. Check yt-dlp
  try {
    const ytdlpPath = process.platform === "win32"
      ? path.join(process.cwd(), "yt-dlp.exe")
      : "/usr/local/bin/yt-dlp";
    const version = execSync(`"${ytdlpPath}" --version`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    results["yt-dlp"] = `✓ ${version}`;
  } catch {
    results["yt-dlp"] = "✗ Not found or not executable";
  }

  // 2. Check JS runtime
  const runtime = RuntimeDetector.getFormattedRuntime();
  results["js-runtime"] = runtime ? `✓ ${runtime}` : "✗ No supported JS runtime found (Node/Deno)";

  // 3. Check ffmpeg
  try {
    const ffmpegVersion = execSync("ffmpeg -version", { stdio: ["ignore", "pipe", "ignore"] }).toString().split("\n")[0];
    results["ffmpeg"] = `✓ ${ffmpegVersion}`;
  } catch {
    results["ffmpeg"] = "✗ Not found";
  }

  // 4. Check cookies
  results["cookies"] = "Not configured"; // CookieManager removed

  // 5. Node.js version
  results["node"] = `✓ ${process.version}`;
  
  // 6. Platform
  results["platform"] = process.platform;

  const hasErrors = Object.values(results).some((v) => v.startsWith("✗"));

  return NextResponse.json(
    {
      status: hasErrors ? "degraded" : "healthy",
      diagnostics: results,
    },
    { status: hasErrors ? 503 : 200 }
  );
}
