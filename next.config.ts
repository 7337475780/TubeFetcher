import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Ignores ESLint during Docker builds
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ Ignores TypeScript errors during build (only if you're okay with this)
  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ Essential for Docker + standalone builds
  output: "standalone",
};

export default nextConfig;
