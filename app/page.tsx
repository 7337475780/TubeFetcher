"use client";

import Input from "@/components/Input";
import VideoCard from "@/components/VideoCard";
import React, { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";

const isValidYoutubeUrl = (url: string) =>
  /^(https?:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/.test(url);

type DownloadMode = "audio" | "video" | "both";

type Format = {
  format_id: string;
  resolution?: string;
  ext: string;
  filesize: number;
  hasAudio: boolean;
  vcodec?: string;
  acodec?: string;
};

type VideoInfo = {
  title: string;
  thumbnail: string;
  duration: number;
  formats: Format[];
};

const Page = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState("");
  const [selectedFormatHasAudio, setSelectedFormatHasAudio] = useState(false);
  const [selectedVideoFormat, setSelectedVideoFormat] = useState("");
  const [selectedAudioFormat, setSelectedAudioFormat] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadMode, setDownloadMode] = useState<DownloadMode>("both");

  useEffect(() => {
    setSelectedFormat("");
    setSelectedFormatHasAudio(false);
    setSelectedVideoFormat("");
    setSelectedAudioFormat("");

    if (!video) return;

    const getRes = (r?: string) => parseInt(r?.replace("p", "") || "0");

    if (downloadMode === "video") {
      const best = video.formats
        .filter((f) => f.acodec === "none" && f.vcodec !== "none")
        .filter((f) => getRes(f.resolution) >= 720)
        .sort((a, b) => getRes(b.resolution) - getRes(a.resolution))[0];
      if (best) {
        setSelectedFormat(best.format_id);
        setSelectedFormatHasAudio(best.hasAudio);
      }
    }

    if (downloadMode === "audio") {
      const best = video.formats
        .filter((f) => f.vcodec === "none" && f.acodec !== "none")
        .sort((a, b) => (b.filesize || 0) - (a.filesize || 0))[0];
      if (best) {
        setSelectedFormat(best.format_id);
        setSelectedFormatHasAudio(best.hasAudio);
      }
    }

    if (downloadMode === "both") {
      const bestVideo = video.formats
        .filter((f) => f.acodec === "none" && f.vcodec !== "none")
        .filter((f) => getRes(f.resolution) >= 720)
        .sort((a, b) => getRes(b.resolution) - getRes(a.resolution))[0];
      const bestAudio = video.formats
        .filter((f) => f.vcodec === "none" && f.acodec !== "none")
        .sort((a, b) => (b.filesize || 0) - (a.filesize || 0))[0];

      if (bestVideo) setSelectedVideoFormat(bestVideo.format_id);
      if (bestAudio) setSelectedAudioFormat(bestAudio.format_id);
    }
  }, [video, downloadMode, url]);

  const fetchInfo = async () => {
    if (!isValidYoutubeUrl(url.trim())) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }

    setVideo(null);
    setFetching(true);

    try {
      const res = await fetch("/api/info", {
        method: "POST",
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) throw new Error("Failed to fetch video info");

      const data: VideoInfo = await res.json();
      setVideo(data);
    } catch {
      toast.error("Failed to fetch video info");
    } finally {
      setFetching(false);
    }
  };

  const sanitizeFilename = (name: string) =>
    name.replace(/[<>:"/\\|?*]+/g, "").slice(0, 100);

  const downloadVideo = async () => {
    if (!url || (!selectedFormat && downloadMode !== "both")) {
      toast.error("Please enter a URL and select a format");
      return;
    }

    if (downloadMode === "both") {
      if (!selectedVideoFormat || !selectedAudioFormat) {
        toast.error("Please select both video and audio formats");
        return;
      }
    }

    setLoading(true);
    setDownloadProgress(0);

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          downloadMode === "both"
            ? {
                url,
                downloadMode,
                videoFormatId: selectedVideoFormat,
                audioFormatId: selectedAudioFormat,
              }
            : {
                url,
                formatId: selectedFormat,
                hasAudio: selectedFormatHasAudio,
                downloadMode,
              }
        ),
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
              setDownloadProgress(
                total
                  ? Math.min(100, Math.round((received / total) * 100))
                  : (prev) => (prev < 95 ? prev + 1 : prev)
              );
            }
          }
          controller.close();
        },
      });

      const blob = await new Response(stream).blob();
      const a = document.createElement("a");
      const extension =
        downloadMode === "audio"
          ? "mp3"
          : video?.formats.find((f) =>
              downloadMode == "both"
                ? f.format_id === selectedVideoFormat
                : f.format_id === selectedFormat
            )?.ext || "mp4";
      a.href = URL.createObjectURL(blob);
      a.download = `${sanitizeFilename(video?.title || "video")}.${extension}`;
      a.click();
      URL.revokeObjectURL(a.href);

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
    <main className="relative min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-200 dark:from-[#0f0f0f] dark:via-[#111] dark:to-black text-gray-900 dark:text-white flex flex-col items-center px-4 py-10 overflow-hidden">
      <Toaster position="top-center" />
      <div className="w-full max-w-xl space-y-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-pink-500 to-orange-400">
          Download YouTube Videos in HD
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
          Unlimited length. High quality. Audio included.
        </p>

        <Input
          placeholder="Paste your YouTube link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          buttonLabel={
            fetching || loading ? (
              <span className="flex items-center gap-1 justify-center">
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                {fetching ? "Fetching..." : "Downloading..."}
              </span>
            ) : (
              "Fetch Info"
            )
          }
          onButtonClick={fetchInfo}
          disabled={loading || fetching}
        />

        {video && (
          <VideoCard
            title={video.title}
            thumbnail={video.thumbnail}
            duration={video.duration}
            formats={video.formats}
            downloadMode={downloadMode}
            onModeChange={setDownloadMode}
            selectedFormat={selectedFormat}
            onFormatChange={(id, hasAudio) => {
              setSelectedFormat(id);
              setSelectedFormatHasAudio(hasAudio);
            }}
            selectedVideoFormat={selectedVideoFormat}
            selectedAudioFormat={selectedAudioFormat}
            onVideoFormatChange={setSelectedVideoFormat}
            onAudioFormatChange={setSelectedAudioFormat}
            onDownload={downloadVideo}
            loading={loading}
            downloadProgress={downloadProgress}
          />
        )}
      </div>
    </main>
  );
};

export default Page;
