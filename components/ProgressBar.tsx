import React from "react";

type Props = {
  progress: number;
};

const ProgressBar = ({ progress }: Props) => (
  <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-5 mt-4 overflow-hidden relative">
    <div
      className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
      style={{ width: `${progress}%` }}
    />
    <span className="absolute inset-0 flex justify-center items-center text-xs font-medium text-white">
      {progress}%
    </span>
  </div>
);

export default ProgressBar;
