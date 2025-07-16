"use client";

import React, { useRef } from "react";
import { toast } from "sonner";
import { XIcon } from "lucide-react";

type Props = {
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onButtonClick?: () => void;
  buttonLabel?: React.ReactNode;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAutoPasted = useRef(false); // ✅ ensures auto-paste happens only once

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onButtonClick && !disabled) {
      e.preventDefault();
      onButtonClick();
    }
  };

  const handleAutoPaste = async () => {
    if (hasAutoPasted.current) return;
    hasAutoPasted.current = true;

    try {
      const text = await navigator.clipboard.readText();
      if (text && text.includes("youtu")) {
        onChange({
          target: { value: text },
        } as React.ChangeEvent<HTMLInputElement>);
        toast("Pasted YouTube URL from clipboard");
      }
    } catch {
      // Clipboard access denied
    }
  };

  const handleClear = () => {
    onChange({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full flex flex-col sm:flex-row gap-3 items-stretch">
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={onChange}
          onFocus={handleAutoPaste} // ✅ onFocus triggers one-time paste
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-label="YouTube video URL"
          className="w-full rounded-full border border-gray-300 bg-white/70 dark:bg-white/10 px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-150 disabled:opacity-50 pr-10"
        />
        {value && !disabled && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition"
            type="button"
            aria-label="Clear input"
          >
            <XIcon size={16} />
          </button>
        )}
      </div>

      <button
        onClick={onButtonClick}
        disabled={disabled}
        className="rounded-full cursor-pointer px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:brightness-110 transition disabled:opacity-50"
      >
        {buttonLabel}
      </button>
    </div>
  );
};

export default Input;
