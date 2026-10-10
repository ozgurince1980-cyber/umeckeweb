import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Vercel build sırasında TS hatalarını yoksayar ve yayına alır
    ignoreBuildErrors: true,
  },
};

export default nextConfig;