import { spawn } from "child_process";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url, format } = req.query;
  if (!url || !format) {
    return res.status(400).json({ error: "Missing url or format" });
  }

  const ytDlpPath = "yt-dlp";

  // Set file extension based on requested format
  const ext =
    String(format).includes("audio") ||
    String(format) === "mp3" ||
    String(format) === "m4a"
      ? String(format) === "mp3"
        ? "mp3"
        : "m4a"
      : "mp4";

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="download.${ext}"`
  );

  // If audio, set audio MIME, otherwise video
  res.setHeader(
    "Content-Type",
    ext === "mp3" || ext === "m4a" ? "audio/mpeg" : "video/mp4"
  );

  // Spawn yt-dlp with the provided format
  const ytdlp = spawn(ytDlpPath, [
    "-f",
    String(format), // User-specified format
    "--no-playlist",
    "-o",
    "-", // Output to stdout
    String(url),
  ]);

  ytdlp.stdout.pipe(res);

  ytdlp.stderr.on("data", (data) => {
    console.error(`yt-dlp error: ${data}`);
  });

  ytdlp.on("close", (code) => {
    if (code !== 0) {
      console.error(`yt-dlp process exited with code ${code}`);
      if (!res.headersSent) {
        res.status(500).end("Failed to download");
      }
    }
  });
}
