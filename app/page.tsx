"use client";

import Input from "@/components/Input";
import VideoCard from "@/components/VideoCard";
import React, { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import CursorBackground from "@/components/CursorBackground";
import { Sparkles, History, PlayCircle } from "lucide-react";

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
  fps?: number;
};

type VideoInfo = {
  title: string;
  thumbnail: string;
  duration: number;
  formats: Format[];
};

type DownloadHistory = {
  id: string;
  title: string;
  thumbnail: string;
  mode: DownloadMode;
  date: string;
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
  const [downloadSpeed, setDownloadSpeed] = useState("");
  const [downloadEta, setDownloadEta] = useState("");
  const [downloadMode, setDownloadMode] = useState<DownloadMode>("both");
  const [history, setHistory] = useState<DownloadHistory[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("tubefetcher_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        console.error("Failed to parse history");
      }
    }
  }, []);

  const saveToHistory = (item: DownloadHistory) => {
    const newHistory = [item, ...history].slice(0, 8);
    setHistory(newHistory);
    localStorage.setItem("tubefetcher_history", JSON.stringify(newHistory));
  };

  const Background = () => (
    <>
      <CursorBackground />
      <div className="fixed inset-0 -z-10 h-full w-full bg-gray-50 dark:bg-[#030303] flex items-center justify-center transition-colors duration-500 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 dark:bg-indigo-900/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-500/10 dark:bg-pink-900/10 blur-[120px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
      </div>
    </>
  );

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
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to fetch video info");
      }
      const data: VideoInfo = await res.json();
      setVideo(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch video info";
      toast.error(message);
    } finally {
      setFetching(false);
    }
  };

  const sanitizeFilename = (name: string) => name.replace(/[<>:"/\\|?*]+/g, "").slice(0, 100);

  const downloadVideo = async () => {
    if (!url || (!selectedFormat && downloadMode !== "both")) return;
    if (downloadMode === "both" && (!selectedVideoFormat || !selectedAudioFormat)) return;

    setLoading(true);
    setDownloadProgress(0);
    setDownloadSpeed("");
    setDownloadEta("");

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          downloadMode === "both"
            ? { url, downloadMode, videoFormatId: selectedVideoFormat, audioFormatId: selectedAudioFormat }
            : { url, formatId: selectedFormat, hasAudio: selectedFormatHasAudio, downloadMode }
        ),
      });

      if (!res.ok) throw new Error(await res.text());
      const reader = res.body?.getReader();
      if (!reader) throw new Error("Download stream error");

      const contentLength = res.headers.get("Content-Length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      const startTime = Date.now();
      let lastReportTime = startTime;
      let bytesSinceLastReport = 0;

      const stream = new ReadableStream({
        async start(controller) {
          let received = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              setDownloadProgress(100);
              break;
            }
            if (value) {
              controller.enqueue(value);
              received += value.length;
              bytesSinceLastReport += value.length;
              const now = Date.now();
              const timeDiff = now - lastReportTime;
              if (timeDiff > 1000) {
                const speedBps = (bytesSinceLastReport / timeDiff) * 1000;
                setDownloadSpeed((speedBps / (1024 * 1024)).toFixed(2) + " MB/s");
                if (total > 0) {
                  const remainingBytes = total - received;
                  const etaSeconds = Math.round(remainingBytes / speedBps);
                  if (etaSeconds > 60) setDownloadEta(Math.floor(etaSeconds / 60) + "m " + (etaSeconds % 60) + "s");
                  else setDownloadEta(etaSeconds + "s");
                }
                lastReportTime = now;
                bytesSinceLastReport = 0;
              }
              setDownloadProgress(total ? Math.min(100, Math.round((received / total) * 100)) : (prev) => (prev < 95 ? prev + 1 : prev));
            }
          }
          controller.close();
        },
      });

      const blob = await new Response(stream).blob();
      const a = document.createElement("a");
      const extension = downloadMode === "audio" ? "mp3" : downloadMode === "both" ? "mkv" : video?.formats.find((f) => f.format_id === selectedFormat)?.ext || "mp4";
      a.href = URL.createObjectURL(blob);
      a.download = `${sanitizeFilename(video?.title || "video")}.${extension}`;
      a.click();
      URL.revokeObjectURL(a.href);

      toast.success("File downloaded successfully!");

      if (video) {
        saveToHistory({
          id: Math.random().toString(36).substring(7),
          title: video.title,
          thumbnail: video.thumbnail,
          mode: downloadMode,
          date: new Date().toLocaleDateString(),
        });
      }
      setUrl("");
      setVideo(null);
    } catch (err) {
      toast.error((err as Error).message || "Download failed");
    } finally {
      setLoading(false);
      setDownloadProgress(0);
      setDownloadSpeed("");
      setDownloadEta("");
    }
  };

  return (
    <main className="relative min-h-screen text-gray-900 dark:text-white overflow-x-hidden selection:bg-indigo-500/30">
      <Background />
      <Toaster position="top-center" />

      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-24">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="lg:col-span-5 flex flex-col justify-center space-y-8 pt-8"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-white/5 border border-indigo-100 dark:border-white/10 text-xs font-medium text-indigo-600 dark:text-indigo-300 mb-6 backdrop-blur-md">
                <Sparkles size={14} />
                <span>Premium Extraction Engine</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-4">
                Extract <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
                  Without Limits.
                </span>
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg max-w-md leading-relaxed">
                Download YouTube videos in stunning 4K or extract crystal clear audio. Powered by advanced format merging and native stream handling.
              </p>
            </div>

            <div className="pt-4 w-full relative">
              <div className="relative">
                <Input
                  placeholder="https://youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  buttonLabel={fetching ? "Fetching..." : "Fetch"}
                  onButtonClick={fetchInfo}
                  disabled={loading || fetching}
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="lg:col-span-7 w-full flex justify-center lg:justify-end"
          >
            <div className="w-full max-w-xl">
              <AnimatePresence mode="wait">
                {fetching ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full aspect-video rounded-3xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 animate-pulse relative overflow-hidden flex flex-col justify-end p-8"
                  >
                    <div className="w-full h-8 bg-gray-200 dark:bg-white/10 rounded-lg mb-4"></div>
                    <div className="w-2/3 h-4 bg-gray-200 dark:bg-white/10 rounded-lg mb-8"></div>
                    <div className="w-full h-12 bg-gray-200 dark:bg-white/10 rounded-xl"></div>
                  </motion.div>
                ) : video ? (
                  <motion.div
                    key="video"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
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
                      downloadSpeed={downloadSpeed}
                      downloadEta={downloadEta}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full aspect-[4/3] lg:aspect-video rounded-3xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center shadow-xl dark:shadow-none"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center mb-6 shadow-md dark:shadow-2xl">
                      <PlayCircle size={32} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-xl font-medium text-gray-800 dark:text-gray-300 mb-2">Ready to Download</h3>
                    <p className="text-sm text-gray-500 max-w-sm">Paste a YouTube URL to the left to instantly fetch formats, codec info, and high-res thumbnails.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-30 w-full"
          >
            <div className="flex items-center gap-2 mb-6">
              <History size={18} className="text-gray-500 dark:text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200">Recent Extractions</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {history.map((item) => (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -5 }}
                  className="group flex flex-col gap-3 p-4 rounded-2xl bg-white dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition-all cursor-default shadow-md dark:shadow-none"
                >
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-black/50">
                    <img src={item.thumbnail} alt="thumb" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 border border-black/5 dark:border-white/10 rounded-xl"></div>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1">{item.title}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-md border border-indigo-200 dark:border-indigo-500/20">
                        {item.mode}
                      </span>
                      <span className="text-xs text-gray-500">{item.date}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
};

export default Page;
