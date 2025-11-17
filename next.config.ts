import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker runtime
  output: "export",
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
