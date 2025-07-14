import React from "react";
import ProgressBar from "./ProgressBar";

type Format = {
  format_id: string;
  resolution: string;
  ext: string;
  filesize: number;
  hasAudio: boolean;
};

type Props = {
  title: string;
  thumbnail: string;
  duration: number;
  formats: Format[];
  selectedFormat: string;
  onFormatChange: (formatId: string, hasAudio: boolean) => void;
  onDownload: () => void;
  loading: boolean;
  downloadProgress: number;
};

const formatSize = (bytes: number) =>
  bytes ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : "Unknown";

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
}: Props) => (
  <div className="bg-white/60 dark:bg-white/10 backdrop-blur-lg border border-gray-200 dark:border-gray-700 shadow-lg p-5 rounded-xl transition hover:shadow-xl">
    <img src={thumbnail} alt="thumbnail" className="w-full rounded-xl" />
    <h2 className="mt-3 text-lg font-semibold">{title}</h2>
    <p className="text-sm text-gray-600 dark:text-gray-400">
      Duration: {duration}s
    </p>

    <select
      className="mt-4 w-full p-2 border rounded-md bg-white dark:bg-black text-sm"
      value={selectedFormat}
      onChange={(e) => {
        const format = formats.find((f) => f.format_id === e.target.value);
        onFormatChange(e.target.value, format?.hasAudio || false);
      }}
    >
      <option value="">Select format</option>
      {formats.map((f) => (
        <option key={f.format_id} value={f.format_id}>
          {f.resolution} ({f.ext}) - {(f.filesize / 1024 / 1024).toFixed(1)} MB{" "}
          {!f.hasAudio && "(No Audio)"}
        </option>
      ))}
    </select>

    <button
      className="mt-4 w-full py-2 rounded-md text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:brightness-110 transition"
      onClick={onDownload}
      disabled={loading}
    >
      {loading ? "Downloading..." : "Download"}
    </button>

    {downloadProgress > 0 && <ProgressBar progress={downloadProgress} />}
  </div>
);

export default VideoCard;
