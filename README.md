# TubeFetcher

TubeFetcher is a fast, clean, and modern YouTube video and audio downloader built with Next.js, Tailwind CSS, and yt-dlp. 

It supports high-quality downloads (1080p, 4K) by automatically merging video and audio streams using fmpeg under the hood. The UI is heavily inspired by modern design trends, featuring glassmorphism, bento grids, and interactive aurora backgrounds.

## Features
- **4K Video Downloads:** Automatically merges high-res video and audio using fmpeg.
- **Audio Extraction:** Quickly extract MP3s from any YouTube link.
- **Modern UI:** Built with Framer Motion, Tailwind CSS, and next-themes for a slick dark/light mode experience.
- **Universal Support:** While optimized for YouTube, the core yt-dlp engine actually supports downloading from over 1,000+ sites (including Twitter, Instagram, and TikTok).

## Setup (Local Development)

### Prerequisites
You need two things installed on your machine for this to work locally:
1. **[ffmpeg](https://ffmpeg.org/download.html)**: Used to merge separate video and audio streams. Make sure it's added to your system PATH.
2. **[yt-dlp](https://github.com/yt-dlp/yt-dlp)**: Place the yt-dlp.exe (on Windows) or the yt-dlp binary (on Mac/Linux) directly in the root folder of this project.

### Running the app
1. Run 
pm install to install dependencies.
2. Start the dev server with 
pm run dev.
3. Open http://localhost:3000 in your browser.

## Deployment

Because this app relies on heavy binary dependencies (yt-dlp and fmpeg) and downloads large temporary files before serving them to the user, **you cannot deploy this to a free serverless tier (like Vercel Hobby)**. Serverless functions will time out and run out of temporary disk space for any video longer than a few minutes.

**The best way to deploy this is on a standard server (like a DigitalOcean Droplet, Hetzner, or AWS EC2).**

We've included a ready-to-go Dockerfile to make deployment stupidly easy. It handles installing Node, ffmpeg, and yt-dlp for you:

`ash
# Build the container
docker build -t tubefetcher .

# Run the container
docker run -p 3000:3000 tubefetcher
`

That's it! If you have Docker installed on a basic /month Linux server, running those two commands will get your app live and completely immune to those annoying serverless timeouts.
