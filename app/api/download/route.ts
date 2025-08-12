// pages/api/download.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { spawn } from "child_process";
import { promisify } from "util";
import stream from "stream";
import { pipeline as pipelineCb } from "stream";
const pipeline = promisify(pipelineCb);

type Body = {
  url: string;
  downloadMode: "audio" | "video" | "both";
  videoFormatId?: string;
  audioFormatId?: string;
};

function safeFilename(name = "download") {
  return String(name)
    .replace(/[<>:"/\\|?*]+/g, "")
    .slice(0, 120);
}

function getYtDlpPath() {
  return process.env.YTDLP_PATH || "yt-dlp";
}
function getFfmpegPath() {
  return process.env.FFMPEG_PATH || "ffmpeg";
}

// Helper to get filename (title + ext) from yt-dlp for chosen format
async function resolveFilename(url: string, format: string) {
  return await new Promise<string>((resolve, reject) => {
    const yt = spawn(getYtDlpPath(), [
      "-f",
      format,
      "--no-playlist",
      "--get-filename",
      "-o",
      "%(title)s.%(ext)s",
      url,
    ]);

    let out = "";
    let err = "";
    yt.stdout.on("data", (b) => (out += b.toString()));
    yt.stderr.on("data", (b) => (err += b.toString()));

    yt.on("close", (code) => {
      if (code === 0) {
        resolve(out.trim().split("\n").pop() || "download");
      } else {
        // fallback to generic name but don't fail hard
        console.warn("yt-dlp --get-filename failed:", err);
        resolve("download");
      }
    });

    yt.on("error", (e) => {
      console.error("yt-dlp spawn error:", e);
      resolve("download");
    });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = req.body as Body;
    const { url, downloadMode, videoFormatId, audioFormatId } = body || {};

    if (!url || !downloadMode) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Build format string used by yt-dlp for streaming
    let formatString = "";
    if (downloadMode === "audio") {
      formatString = audioFormatId || "bestaudio";
    } else if (downloadMode === "video") {
      formatString = videoFormatId || "bestvideo";
    } else {
      // both
      if (videoFormatId && audioFormatId)
        formatString = `${videoFormatId}+${audioFormatId}`;
      else formatString = "bestvideo+bestaudio/best";
    }

    // Resolve filename for Content-Disposition (best-effort)
    const filenameRaw = await resolveFilename(url, formatString);
    const ext =
      filenameRaw.split(".").pop() ||
      (downloadMode === "audio" ? "mp3" : "mp4");
    const filename = safeFilename(filenameRaw || `download.${ext}`);

    // Set headers early (will be used by browser)
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    if (downloadMode === "audio") {
      res.setHeader("Content-Type", "audio/mpeg");
    } else {
      res.setHeader("Content-Type", "video/mp4");
    }

    // Spawn yt-dlp to output to stdout
    // Use '-o -' to stream to stdout
    const ytdlpArgs = ["-f", formatString, "--no-playlist", "-o", "-", url];
    const ytdlp = spawn(getYtDlpPath(), ytdlpArgs, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Wire up stderr logging
    ytdlp.stderr.on("data", (b) => {
      console.error("yt-dlp:", b.toString());
    });

    // If audio-only: pipe yt-dlp stdout into ffmpeg to convert to mp3, then to res
    if (downloadMode === "audio") {
      const ffmpeg = spawn(
        getFfmpegPath(),
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-i",
          "pipe:0",
          "-f",
          "mp3",
          "-b:a",
          "192k",
          "pipe:1",
        ],
        { stdio: ["pipe", "pipe", "pipe"] }
      );

      // log ffmpeg stderr
      ffmpeg.stderr.on("data", (b) => {
        console.error("ffmpeg:", b.toString());
      });

      // Pipe yt-dlp -> ffmpeg -> res
      ytdlp.stdout.pipe(ffmpeg.stdin);

      // if client disconnects, kill children
      const onClose = () => {
        if (!ytdlp.killed) ytdlp.kill("SIGKILL");
        if (!ffmpeg.killed) ffmpeg.kill("SIGKILL");
      };
      req.on("close", onClose);
      req.on("aborted", onClose);

      // stream ffmpeg stdout to response using pipeline for proper backpressure
      await pipeline(ffmpeg.stdout, res);
      // pipeline resolves when stream ends; then clean up
      ffmpeg.stdin?.end();
      if (!ytdlp.killed) ytdlp.kill();
      if (!ffmpeg.killed) ffmpeg.kill();
      return;
    }

    // For video or both: yt-dlp already outputs (merged) mp4/other container to stdout
    const onClientClose = () => {
      if (!ytdlp.killed) ytdlp.kill("SIGKILL");
    };
    req.on("close", onClientClose);
    req.on("aborted", onClientClose);

    // pipe yt-dlp stdout directly to response (streaming)
    await pipeline(ytdlp.stdout, res);

    // cleanup
    if (!ytdlp.killed) ytdlp.kill();
    return;
  } catch (err) {
    console.error("download API error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Internal server error" });
    } else {
      // if headers already sent, just end
      try {
        res.end();
      } catch {}
    }
  }
}
