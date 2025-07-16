"use client";

import React from "react";

type Props = {
  progress: number;
};

const ProgressBar = ({ progress }: Props) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div
      role="progressbar"
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-5 mt-4 overflow-hidden relative"
    >
      <div
        className={`h-full transition-all duration-300 ${
          clampedProgress === 100
            ? "bg-green-500"
            : "bg-gradient-to-r from-blue-500 to-purple-600"
        }`}
        style={{ width: `${clampedProgress}%` }}
      />
      <span className="absolute inset-0 flex justify-center items-center text-xs font-medium text-white">
        {clampedProgress}%
      </span>
    </div>
  );
};

export default ProgressBar;
