// pages/api/download.ts
import { spawn } from "child_process";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url, type } = req.query;
  if (!url || !type) {
    return res.status(400).json({ error: "Missing url or type" });
  }

  const ytDlpPath =
    process.env.YTDLP_PATH || path.join(process.cwd(), "bin", "yt-dlp");

  let format = "bestvideo+bestaudio/best";
  if (type === "audio") format = "bestaudio";
  else if (type === "video") format = "bestvideo";

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="download.${type === "audio" ? "mp3" : "mp4"}"`
  );
  res.setHeader("Content-Type", type === "audio" ? "audio/mpeg" : "video/mp4");

  const ytdlp = spawn(ytDlpPath, [
    "-f",
    format,
    "--no-playlist",
    "--quiet",
    "-o",
    "-", // output to stdout
    url as string,
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
