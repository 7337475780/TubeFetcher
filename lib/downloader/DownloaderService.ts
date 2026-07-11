import { execFile, execSync, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";
import { RuntimeDetector } from "./RuntimeDetector";
import { CookieManager } from "./CookieManager";
import { UrlNormalizer } from "./UrlNormalizer";
import { RetryManager } from "./RetryManager";
import { DownloaderError, parseYtDlpError } from "./DownloaderError";
import { Logger } from "./Logger";

const execFileAsync = promisify(execFile);

export interface DownloadResult {
  stream: ReadableStream;
  filename: string;
  contentLength?: number;
}

export class DownloaderService {
  private static initialized = false;

  /**
   * Initializes the DownloaderService and runs startup diagnostics once.
   */
  static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.runStartupDiagnostics();
  }

  /**
   * Returns the absolute path of the yt-dlp executable.
   */
  static getYtDlpPath(): string {
    if (process.platform === "win32") {
      return path.join(process.cwd(), "yt-dlp.exe");
    }

    try {
      const pathFromWhich = execSync("which yt-dlp", {
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim();
      if (pathFromWhich && fs.existsSync(pathFromWhich)) {
        return pathFromWhich;
      }
    } catch {
      // Ignore
    }

    return "/usr/local/bin/yt-dlp";
  }

  /**
   * Runs startup diagnostics and prints standard configuration info.
   */
  private static runStartupDiagnostics(): void {
    Logger.info("Starting Downloader Diagnostics...");
    Logger.info(`✓ Operating system: ${process.platform}`);
    Logger.info(`✓ Node version: ${process.version}`);

    try {
      const ytDlpPath = this.getYtDlpPath();
      const version = execSync(`"${ytDlpPath}" --version`, {
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim();
      Logger.info(`✓ yt-dlp version: ${version}`);
    } catch {
      Logger.warn("✗ yt-dlp check failed. Executable might be missing or not in PATH.");
    }

    const runtime = RuntimeDetector.getFormattedRuntime();
    Logger.info(`✓ Runtime selected: ${runtime || "None"}`);

    try {
      const ffmpegVersion = execSync("ffmpeg -version", {
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .split("\n")[0]
        .trim();
      Logger.info(`✓ FFmpeg version: ${ffmpegVersion}`);
    } catch {
      Logger.warn("✗ FFmpeg check failed. FFmpeg might be missing or not in PATH.");
    }

    const cookiesSource = CookieManager.getDiagnostics();
    Logger.info(`✓ Cookies source: ${cookiesSource}`);
  }

  /**
   * Fetches metadata for a YouTube URL in JSON format, normalizes the URL,
   * handles authentication arguments, and retries on transient errors.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async getInfo(url: string): Promise<any> {
    this.initialize();
    const normalizedUrl = UrlNormalizer.normalize(url);
    const ytDlpPath = this.getYtDlpPath();

    return RetryManager.retry(async () => {
      const args = [
        "-J",
        "--no-playlist",
        "--no-check-certificates",
        ...RuntimeDetector.getRuntimeArgs(),
        ...CookieManager.getAuthArgs(),
        normalizedUrl,
      ];

      Logger.info(`INFO Fetching metadata for ${normalizedUrl}`);
      try {
        const { stdout } = await execFileAsync(ytDlpPath, args, {
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large JSON payloads
        });
        return JSON.parse(stdout);
      } catch (err: unknown) {
        const error = err as { stderr?: string; message?: string };
        const stderr = error.stderr || error.message || "";
        const parsed = parseYtDlpError(stderr);
        Logger.error(`ERROR Failed to fetch metadata: ${parsed.message}`, parsed);
        throw parsed;
      }
    });
  }

  /**
   * Starts a download process based on parameters, returning the readable stream
   * and download metadata.
   */
  static async download(options: {
    url: string;
    downloadMode: "audio" | "video" | "both";
    formatId?: string;
    videoFormatId?: string;
    audioFormatId?: string;
  }): Promise<DownloadResult> {
    this.initialize();
    const normalizedUrl = UrlNormalizer.normalize(options.url);
    const ytDlpPath = this.getYtDlpPath();

    const args = [
      ...RuntimeDetector.getRuntimeArgs(),
      ...CookieManager.getAuthArgs(),
      "--no-check-certificates",
    ];

    let isTempFile = false;
    let tempPath = "";
    let filename = "video.mp4";

    if (options.downloadMode === "audio") {
      if (!options.formatId) throw new Error("Missing audio format");
      isTempFile = true;
      const baseName = `yt_dlp_${Date.now()}`;
      tempPath = path.join(os.tmpdir(), `${baseName}.mp3`);
      const templatePath = path.join(os.tmpdir(), `${baseName}.%(ext)s`);
      args.push("-f", options.formatId, "-x", "--audio-format", "mp3", "-o", templatePath, "--no-playlist");
      filename = "audio.mp3";
    } else if (options.downloadMode === "video") {
      if (!options.formatId) throw new Error("Missing video format");
      args.push("-f", options.formatId, "-o", "-", "--no-playlist");
      filename = "video.mp4";
    } else if (options.downloadMode === "both") {
      if (!options.videoFormatId || !options.audioFormatId) {
        throw new Error("Missing video or audio format");
      }
      isTempFile = true;
      const baseName = `yt_dlp_${Date.now()}`;
      tempPath = path.join(os.tmpdir(), `${baseName}.mkv`);
      const templatePath = path.join(os.tmpdir(), `${baseName}.%(ext)s`);
      args.push(
        "-f",
        `${options.videoFormatId}+${options.audioFormatId}`,
        "-o",
        templatePath,
        "--merge-output-format",
        "mkv",
        "--no-playlist"
      );
      filename = "video.mkv";
    }

    args.push(normalizedUrl);

    Logger.info(`INFO Download started: mode=${options.downloadMode}, url=${normalizedUrl}`);

    if (isTempFile) {
      // Execute the downloader process inside a retry loop for reliability
      await RetryManager.retry(async () => {
        return new Promise<void>((resolve, reject) => {
          const ytProcess = spawn(ytDlpPath, args);
          let stderr = "";

          ytProcess.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
          });

          ytProcess.on("close", (code) => {
            if (code === 0) {
              resolve();
            } else {
              const parsed = parseYtDlpError(stderr);
              Logger.error(`ERROR Download process failed: ${parsed.message}`, parsed);
              reject(parsed);
            }
          });

          ytProcess.on("error", (err) => {
            reject(new DownloaderError("UNKNOWN", err.message, err));
          });
        });
      });

      const stat = fs.statSync(tempPath);

      // Create stream to read from temp file and cleanup afterwards
      const stream = new ReadableStream({
        start(controller) {
          const fileStream = fs.createReadStream(tempPath);
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => {
            controller.close();
            try {
              fs.unlinkSync(tempPath);
            } catch {
              // Ignore
            }
          });
          fileStream.on("error", (err) => {
            controller.error(err);
            try {
              fs.unlinkSync(tempPath);
            } catch {
              // Ignore
            }
          });
        },
        cancel() {
          try {
            fs.unlinkSync(tempPath);
          } catch {
            // Ignore
          }
        },
      });

      return {
        stream,
        filename,
        contentLength: stat.size,
      };
    } else {
      // Direct stream download
      const ytProcess = spawn(ytDlpPath, args);
      let stderr = "";

      ytProcess.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      const stream = new ReadableStream({
        start(controller) {
          let isClosed = false;

          ytProcess.stdout.on("data", (chunk) => {
            if (!isClosed) controller.enqueue(chunk);
          });

          ytProcess.on("close", (code) => {
            if (!isClosed) {
              if (code === 0) {
                controller.close();
              } else {
                const parsed = parseYtDlpError(stderr);
                Logger.error(`ERROR Stream download process failed: ${parsed.message}`);
                controller.error(parsed);
              }
              isClosed = true;
            }
          });

          ytProcess.on("error", (err) => {
            if (!isClosed) {
              controller.error(new DownloaderError("UNKNOWN", err.message, err));
              isClosed = true;
            }
          });
        },
        cancel() {
          ytProcess.kill();
        },
      });

      return {
        stream,
        filename,
      };
    }
  }
}
