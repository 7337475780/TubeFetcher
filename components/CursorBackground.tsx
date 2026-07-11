"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

const CursorBackground = () => {
  const { resolvedTheme } = useTheme();
  const [mousePosition, setMousePosition] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Aurora Glow 1 */}
      <motion.div
        animate={{
          x: [0, 100, -100, 0],
          y: [0, -50, 50, 0],
          scale: [1, 1.2, 0.8, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] rounded-full bg-indigo-500/20 dark:bg-indigo-600/20 blur-[120px]"
      />
      
      {/* Aurora Glow 2 */}
      <motion.div
        animate={{
          x: [0, -100, 100, 0],
          y: [0, 50, -50, 0],
          scale: [1, 0.8, 1.2, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vh] rounded-full bg-pink-500/20 dark:bg-pink-600/20 blur-[120px]"
      />

      {/* Aurora Glow 3 */}
      <motion.div
        animate={{
          x: [0, 50, -50, 0],
          y: [0, 100, -100, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-[20%] right-[20%] w-[40vw] h-[40vh] rounded-full bg-purple-500/20 dark:bg-purple-600/20 blur-[100px]"
      />

      {/* Interactive Spotlight following cursor */}
      <div
        className="absolute inset-0 transition-opacity duration-300 mix-blend-overlay"
        style={{
          background: `radial-gradient(800px circle at ${mousePosition.x}px ${mousePosition.y}px, ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}, transparent 40%)`
        }}
      />
      
      {/* Noise Texture Overlay for Premium Feel */}
      <div 
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
    </div>
  );
};

export default CursorBackground;
