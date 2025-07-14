"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import ThemeToggle from "./ThemeToggle";

const Navbar = () => {
  return (
    <nav className="w-full border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="h-10 max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/logo.png"
            alt="TubeFetcher Logo"
            width={24}
            height={24}
            priority
            className="rounded-sm"
          />
          <h1 className="text-lg font-semibold tracking-wide text-red-600 dark:text-red-500">
            Tube<span className="text-black dark:text-white">Fetcher</span>
          </h1>
        </Link>

        {/* Optional right-side links or actions */}
        {/* <div className="text-sm text-gray-600 dark:text-gray-300">Beta</div> */}

        <ThemeToggle />
      </div>
    </nav>
  );
};

export default Navbar;
