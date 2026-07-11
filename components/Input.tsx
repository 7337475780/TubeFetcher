"use client";

import React, { useRef } from "react";
import { toast } from "sonner";
import { XIcon, Link as LinkIcon, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

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
  buttonLabel = "Fetch",
  disabled = false,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAutoPasted = useRef(false);

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
        onChange({ target: { value: text } } as React.ChangeEvent<HTMLInputElement>);
        toast.success("URL pasted from clipboard");
      }
    } catch {
      // Clipboard access denied
    }
  };

  return (
    <div className="relative w-full group/input">
      <div className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover/input:opacity-100 transition duration-500 overflow-hidden pointer-events-none">
        <div className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#e2cbff_0%,#4f46e5_50%,#e2cbff_100%)]"></div>
      </div>
      
      <div className="relative w-full flex items-center bg-white dark:bg-[#030303] backdrop-blur-xl rounded-2xl p-2 transition-all shadow-xl dark:shadow-2xl z-10 border border-gray-200 dark:border-white/10 group-hover/input:border-transparent dark:group-hover/input:border-transparent">
        
        <div className="pl-4 pr-2 text-gray-400 dark:text-gray-500">
          <LinkIcon size={20} />
        </div>

        <input
          ref={inputRef}
          type="text"
          className="w-full bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-lg py-3 px-2 disabled:opacity-50"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onFocus={handleAutoPaste}
          disabled={disabled}
          autoComplete="off"
          spellCheck="false"
        />

        {value && (
          <button
            onClick={() => {
              onChange({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>);
              inputRef.current?.focus();
            }}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/10 mx-2"
            disabled={disabled}
            title="Clear"
          >
            <XIcon size={18} />
          </button>
        )}

        {onButtonClick && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onButtonClick}
            disabled={disabled || !value}
            className="ml-2 flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-white/10 dark:hover:bg-white/20 disabled:opacity-50 transition-all border border-transparent dark:border-white/5"
          >
            {buttonLabel}
            <ArrowRight size={18} className="opacity-70" />
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default Input;
