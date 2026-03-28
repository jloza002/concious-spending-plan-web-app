import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Turbopack the monorepo root is one level up from frontend/
  // This prevents it from scanning duplicate lockfiles and reduces memory usage
  turbopack: {
    root: "..",
  },
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
