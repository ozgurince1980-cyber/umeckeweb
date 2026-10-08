import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.211:3000", "192.168.1.211"],
  typescript: {
    // Vercel build sırasında TypeScript hatalarını yoksayar
    ignoreBuildErrors: true,
  },
};

export default nextConfig;