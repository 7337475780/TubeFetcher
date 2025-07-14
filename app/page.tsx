"use client";

import Input from "@/components/Input";
import ProgressBar from "@/components/ProgressBar";
import VideoCard from "@/components/VideoCard";
import React, { useState } from "react";
import { toast, Toaster } from "sonner";

const isValidYoutubeUrl = (url: string) =>
  /^(https?:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/.test(url);

const Page = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [video, setVideo] = useState<any>(null);
  const [selectedFormat, setSelectedFormat] = useState("");
  const [selectedFormatHasAudio, setSelectedFormatHasAudio] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const fetchInfo = async () => {
    if (!isValidYoutubeUrl(url.trim())) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }

    setVideo(null);
    setSelectedFormat("");
    setSelectedFormatHasAudio(false);
    setFetching(true);

    try {
      const res = await fetch("/api/info", {
        method: "POST",
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) throw new Error("Failed to fetch video info");

      const data = await res.json();
      setVideo(data);
    } catch (err) {
      toast.error("Failed to fetch video info");
    } finally {
      setFetching(false);
    }
  };

  const sanitizeFilename = (name: string) =>
    name.replace(/[<>:"/\\|?*]+/g, "").slice(0, 100);

  const downloadVideo = async () => {
    if (!url || !selectedFormat) {
      toast.error("Please enter a URL and select a format");
      return;
    }

    setLoading(true);
    setDownloadProgress(0);

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          formatId: selectedFormat,
          hasAudio: selectedFormatHasAudio,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Download stream error");

      const contentLength = res.headers.get("Content-Length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      const stream = new ReadableStream({
        async start(controller) {
          let received = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            if (value) {
              controller.enqueue(value);
              received += value.length;

              if (total) {
                setDownloadProgress(
                  Math.min(100, Math.round((received / total) * 100))
                );
              } else {
                setDownloadProgress((prev) => (prev < 95 ? prev + 1 : prev));
              }
            }
          }

          controller.close();
        },
      });

      const blob = await new Response(stream).blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${sanitizeFilename(video.title || "video")}.mp4`;
      a.click();

      toast.success("Download complete!");
      setUrl("");
      setVideo(null);
    } catch (err: any) {
      toast.error(err.message || "Download failed");
    } finally {
      setLoading(false);
      setDownloadProgress(0);
    }
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-200 dark:from-[#0f0f0f] dark:via-[#111] dark:to-black text-gray-900 dark:text-white flex flex-col items-center px-4 py-10 transition-colors duration-300 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute -z-10 top-[-10%] left-[-15%] w-[400px] h-[400px] bg-gradient-to-tr from-red-500 via-pink-500 to-purple-500 rounded-full filter blur-3xl opacity-40"></div>
      <div className="absolute -z-10 bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-gradient-to-br from-blue-400 via-cyan-500 to-teal-400 rounded-full filter blur-3xl opacity-30"></div>

      {/* Main content */}
      <Toaster position="top-center" />
      <div className="w-full max-w-xl space-y-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-pink-500 to-orange-400">
          Download YouTube Videos in HD
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
          Unlimited length. High quality. Audio included.
        </p>

        <Input
          placeholder="Paste your YouTube link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          buttonLabel={fetching ? "Fetching..." : "Fetch Info"}
          onButtonClick={fetchInfo}
          disabled={loading || fetching}
        />

        {video && (
          <VideoCard
            downloadProgress={downloadProgress}
            title={video.title}
            thumbnail={video.thumbnail}
            duration={video.duration}
            formats={video.formats}
            selectedFormat={selectedFormat}
            onFormatChange={(id, hasAudio) => {
              setSelectedFormat(id);
              setSelectedFormatHasAudio(hasAudio);
            }}
            onDownload={downloadVideo}
            loading={loading}
          />
        )}
      </div>
    </main>
  );
};

export default Page;
