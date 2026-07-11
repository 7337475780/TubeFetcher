"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-10 h-10" />;

  const isDark = theme === "dark" || resolvedTheme === "dark";

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors focus:outline-none cursor-pointer"
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 180 : 0, scale: isDark ? 0 : 1, opacity: isDark ? 0 : 1 }}
        transition={{ duration: 0.3, ease: "backOut" }}
        className="absolute"
      >
        <Sun size={18} />
      </motion.div>

      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 0 : -180, scale: isDark ? 1 : 0, opacity: isDark ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "backOut" }}
        className="absolute"
      >
        <Moon size={18} />
      </motion.div>
    </motion.button>
  );
}

export default ThemeToggle;
