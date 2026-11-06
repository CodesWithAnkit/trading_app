import type { NextConfig } from "next";

const backendApiUrl = (process.env.BACKEND_API_URL || "http://localhost:3001").replace(/\/$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.app",
    "*.ngrok.io",
    "unflagitious-lora-superinfinitely.ngrok-free.dev",
  ],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendApiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

