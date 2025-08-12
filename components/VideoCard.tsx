"use client";

import React from "react";
import ProgressBar from "./ProgressBar";
import { formatDuration } from "@/lib/utils";

type Format = {
  format_id: string;
  resolution?: string;
  ext: string;
  filesize: number;
  hasAudio: boolean;
  vcodec?: string;
  acodec?: string;
};

type DownloadMode = "audio" | "video" | "both";

type Props = {
  title: string;
  thumbnail: string;
  duration: number;
  formats: Format[];
  selectedFormat: string;
  onFormatChange: (id: string, hasAudio: boolean) => void;
  onDownload: () => void;
  loading: boolean;
  downloadProgress: number;
  downloadMode: DownloadMode;
  onModeChange: (mode: DownloadMode) => void;
  selectedVideoFormat?: string;
  selectedAudioFormat?: string;
  onVideoFormatChange?: (id: string) => void;
  onAudioFormatChange?: (id: string) => void;
};

const formatSize = (bytes?: number) => {
  if (!bytes || isNaN(bytes)) return "Unknown";
  const units = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

const VideoCard = ({
  title,
  thumbnail,
  duration,
  formats,
  selectedFormat,
  onFormatChange,
  onDownload,
  loading,
  downloadProgress,
  downloadMode,
  onModeChange,
  selectedVideoFormat,
  selectedAudioFormat,
  onVideoFormatChange,
  onAudioFormatChange,
}: Props) => {
  const sortByQuality = (a: Format, b: Format) =>
    (parseInt(b.resolution || "0") || 0) - (parseInt(a.resolution || "0") || 0);

  const audioFormats = formats
    .filter((f) => f.vcodec === "none")
    .sort((a, b) => (b.filesize || 0) - (a.filesize || 0));

  const videoFormats = formats
    .filter(
      (f) =>
        f.acodec === "none" &&
        parseInt(f.resolution?.replace("p", "") || "0") >= 720
    )
    .sort(sortByQuality);

  const bothFormats = formats
    .filter(
      (f) =>
        f.vcodec !== "none" &&
        f.acodec !== "none" &&
        parseInt(f.resolution?.replace("p", "") || "0") >= 720
    )
    .sort(sortByQuality);

  const selectedVideo = formats.find(
    (f) => f.format_id === selectedVideoFormat
  );
  const selectedAudio = formats.find(
    (f) => f.format_id === selectedAudioFormat
  );
  const totalSize =
    (selectedVideo?.filesize || 0) + (selectedAudio?.filesize || 0);

  return (
    <div className="bg-white/60 dark:bg-white/10 backdrop-blur-lg border border-gray-200 dark:border-gray-700 shadow-lg p-5 rounded-xl transition hover:shadow-xl">
      <img src={thumbnail} alt="thumbnail" className="w-full rounded-xl" />
      <h2 className="mt-3 text-lg font-semibold">{title}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Duration: {formatDuration(duration)}
      </p>

      {/* Mode Toggle */}
      <div className="mt-4 flex justify-center gap-2">
        {(["both", "audio", "video"] as DownloadMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`px-4 py-2 cursor-pointer rounded-full text-sm font-medium border transition ${
              downloadMode === mode
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-black text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {mode === "audio"
              ? "Audio Only"
              : mode === "video"
              ? "Video Only"
              : "Audio + Video"}
          </button>
        ))}
      </div>

      <p className="text-xs text-blue-600 dark:text-blue-400 text-center mt-1">
        Best quality selected automatically
      </p>

      {/* Format Selectors */}
      {downloadMode === "both" ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <select
            value={selectedVideoFormat}
            onChange={(e) => onVideoFormatChange?.(e.target.value)}
            className="px-3 py-2 rounded border text-sm bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-100"
          >
            <option value="">Select Video</option>
            {videoFormats.map((f) => (
              <option key={f.format_id} value={f.format_id}>
                {f.resolution || "Video"} ({f.ext}) - {formatSize(f.filesize)}
              </option>
            ))}
          </select>

          <select
            value={selectedAudioFormat}
            onChange={(e) => onAudioFormatChange?.(e.target.value)}
            className="px-3 py-2 rounded border text-sm bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-100"
          >
            <option value="">Select Audio</option>
            {audioFormats.map((f) => (
              <option key={f.format_id} value={f.format_id}>
                Audio ({f.ext}) - {formatSize(f.filesize)}
              </option>
            ))}
          </select>

          {selectedVideoFormat && selectedAudioFormat && (
            <div className="col-span-2 text-center text-sm text-muted-foreground">
              Estimated size: {formatSize(totalSize)}
            </div>
          )}
        </div>
      ) : (
        <select
          className="mt-4 w-full px-4 py-2 rounded-full border bg-white dark:bg-zinc-900 text-sm text-gray-800 dark:text-gray-100"
          value={selectedFormat}
          onChange={(e) => {
            const f = formats.find((f) => f.format_id === e.target.value);
            onFormatChange(e.target.value, f?.hasAudio ?? false);
          }}
        >
          <option disabled value="">
            Select format
          </option>
          {(downloadMode === "audio"
            ? audioFormats
            : downloadMode === "video"
            ? videoFormats
            : bothFormats
          ).map((f) => (
            <option key={f.format_id} value={f.format_id}>
              {f.resolution || "Audio"} ({f.ext}) - {formatSize(f.filesize)}
            </option>
          ))}
        </select>
      )}

      <button
        className="mt-4 w-full py-2 cursor-pointer rounded-md text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:brightness-110 transition"
        onClick={onDownload}
        disabled={
          loading ||
          (downloadMode === "both"
            ? !selectedVideoFormat || !selectedAudioFormat
            : !selectedFormat)
        }
      >
        {loading
          ? "Downloading..."
          : downloadMode === "audio"
          ? "Download Audio"
          : downloadMode === "video"
          ? "Download Video Only"
          : "Download Full Video"}
      </button>

      {downloadProgress > 0 && <ProgressBar progress={downloadProgress} />}
    </div>
  );
};

export default VideoCard;
