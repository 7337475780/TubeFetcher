"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import ThemeToggle from "./ThemeToggle";

const Navbar = () => {
  return (
    <nav className="sticky top-0 w-full h-16 border-b border-gray-200/50 dark:border-white/5 bg-white/70 dark:bg-[#030303]/70 backdrop-blur-xl shadow-sm z-50 transition-colors duration-500">
      <div className="h-full max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/images/logo.png"
            alt="TubeFetcher Logo"
            width={32}
            height={32}
            priority
            className="rounded-xl transform  transition-all duration-300 group-hover:shadow-indigo-500/20"
          />
          <h1 className="text-2xl font-black tracking-tighter text-gray-900 dark:text-white">
            Tube<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-pink-500">Fetcher</span>
          </h1>
        </Link>

        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
