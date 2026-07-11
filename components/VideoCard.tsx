"use client";

import React, { useState } from "react";
import ProgressBar from "./ProgressBar";
import { formatDuration } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

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
  downloadSpeed?: string;
  downloadEta?: string;
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

const getCodecScore = (vcodec?: string) => {
  if (!vcodec) return 0;
  if (vcodec.startsWith("avc")) return 3; // H.264 (Smoothest)
  if (vcodec.startsWith("vp9")) return 2; // VP9
  if (vcodec.startsWith("av01")) return 1; // AV1 (Can be laggy)
  return 0;
};

const CustomSelect = ({ value, onChange, options, placeholder }: { value: string, onChange: (v: string) => void, options: { value: string, label: string }[], placeholder: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm bg-white/80 dark:bg-black/50 backdrop-blur-md text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-white/5 transition-all outline-none"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 py-1 max-h-60 overflow-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-xl"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  value === opt.value
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                }`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
  downloadSpeed,
  downloadEta,
  downloadMode,
  onModeChange,
  selectedVideoFormat,
  selectedAudioFormat,
  onVideoFormatChange,
  onAudioFormatChange,
}: Props) => {
  const [isHovered, setIsHovered] = useState(false);

  const sortByQuality = (a: Format, b: Format) => {
    const resDiff = (parseInt(b.resolution || "0") || 0) - (parseInt(a.resolution || "0") || 0);
    if (resDiff !== 0) return resDiff;
    
    const fpsDiff = (b.fps || 0) - (a.fps || 0);
    if (fpsDiff !== 0) return fpsDiff;

    const codecDiff = getCodecScore(b.vcodec) - getCodecScore(a.vcodec);
    if (codecDiff !== 0) return codecDiff;

    return (b.filesize || 0) - (a.filesize || 0);
  };

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
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95, rotateX: 0, rotateY: 0 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      whileHover={{ scale: 1.02, rotateX: 2, rotateY: 2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{ transformStyle: "preserve-3d" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-white/60 dark:bg-white/10 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl p-6 rounded-3xl transition-all"
    >
      <div className="relative overflow-hidden rounded-xl">
        <motion.img 
          src={thumbnail} 
          alt="thumbnail" 
          className="w-full object-cover rounded-xl"
          animate={{ scale: isHovered ? 1.05 : 1 }}
          transition={{ duration: 0.4 }}
        />
        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md text-white text-xs font-semibold px-2 py-1 rounded-md">
          {formatDuration(duration)}
        </div>
      </div>
      
      <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white truncate">{title}</h2>
      
      {/* Mode Toggle */}
      <div className="mt-5 flex justify-center gap-2 p-1 bg-gray-100 dark:bg-black/40 rounded-full border border-gray-200 dark:border-white/5">
        {(["both", "audio", "video"] as DownloadMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`flex-1 py-2 cursor-pointer rounded-full text-sm font-semibold transition-all duration-300 ${
              downloadMode === mode
                ? "bg-white dark:bg-white/20 shadow-sm text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {mode === "audio"
              ? "Audio"
              : mode === "video"
              ? "Video"
              : "Merged"}
          </button>
        ))}
      </div>

      {/* Format Selectors */}
      <div className="mt-5">
        {downloadMode === "both" ? (
          <div className="grid grid-cols-2 gap-3">
            <CustomSelect
              value={selectedVideoFormat || ""}
              onChange={(val) => onVideoFormatChange?.(val)}
              placeholder="Select Video"
              options={videoFormats.map((f) => ({
                value: f.format_id,
                label: `${f.resolution || "Video"} ${f.fps ? `@${f.fps}fps` : ""} (${f.ext}${f.vcodec?.startsWith("av01") ? ", AV1" : f.vcodec?.startsWith("vp9") ? ", VP9" : f.vcodec?.startsWith("avc") ? ", H.264" : ""}) - ${formatSize(f.filesize)}`
              }))}
            />

            <CustomSelect
              value={selectedAudioFormat || ""}
              onChange={(val) => onAudioFormatChange?.(val)}
              placeholder="Select Audio"
              options={audioFormats.map((f) => ({
                value: f.format_id,
                label: `Audio (${f.ext}) - ${formatSize(f.filesize)}`
              }))}
            />

            {selectedVideoFormat && selectedAudioFormat && (
              <div className="col-span-2 flex justify-between items-center px-4 py-2 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Estimated Size</span>
                <span className="text-sm font-bold text-blue-800 dark:text-blue-200">{formatSize(totalSize)}</span>
              </div>
            )}
          </div>
        ) : (
          <CustomSelect
            value={selectedFormat}
            onChange={(val) => {
              const f = formats.find((f) => f.format_id === val);
              onFormatChange(val, f?.hasAudio ?? false);
            }}
            placeholder="Select format"
            options={(downloadMode === "audio"
              ? audioFormats
              : downloadMode === "video"
              ? videoFormats
              : bothFormats
            ).map((f) => ({
              value: f.format_id,
              label: `${f.resolution || "Audio"} ${f.fps ? `@${f.fps}fps` : ""} (${f.ext}${f.vcodec && f.vcodec !== "none" ? (f.vcodec.startsWith("av01") ? ", AV1" : f.vcodec.startsWith("vp9") ? ", VP9" : f.vcodec.startsWith("avc") ? ", H.264" : "") : ""}) - ${formatSize(f.filesize)}`
            }))}
          />
        )}
      </div>

      <button
        className="mt-6 w-full py-3.5 cursor-pointer rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 transition-all transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
        onClick={onDownload}
        disabled={
          loading ||
          (downloadMode === "both"
            ? !selectedVideoFormat || !selectedAudioFormat
            : !selectedFormat)
        }
      >
        {loading
          ? "Processing..."
          : downloadMode === "audio"
          ? "Download Audio"
          : downloadMode === "video"
          ? "Download Video"
          : "Merge & Download"}
      </button>

      {downloadProgress > 0 && (
         <div className="mt-5 space-y-2">
            <ProgressBar progress={downloadProgress} />
            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 font-medium px-1">
               <span>{downloadSpeed || "Calculating..."}</span>
               {downloadEta && <span>ETA: {downloadEta}</span>}
            </div>
         </div>
      )}
    </motion.div>
  );
};

export default VideoCard;
