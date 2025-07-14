"use client";

import React from "react";

type Props = {
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onButtonClick?: () => void;
  buttonLabel?: string;
  disabled?: boolean;
};

const Input = ({
  placeholder = "Paste YouTube link...",
  value,
  onChange,
  onButtonClick,
  buttonLabel = "Submit",
  disabled = false,
}: Props) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch w-full">
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 rounded-full border border-gray-300 bg-white/70 dark:bg-white/10 px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-150 disabled:opacity-50"
      />
      <button
        onClick={onButtonClick}
        disabled={disabled}
        className="rounded-full px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:brightness-110 transition disabled:opacity-50"
      >
        {buttonLabel}
      </button>
    </div>
  );
};

export default Input;
