import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy API calls to the backend on Railway
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${process.env.BACKEND_URL || "http://localhost:4000"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
