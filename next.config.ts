import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const target = process.env.ERPNEXT_URL || "http://dev.localhost:8001";
    return [
      {
        source: "/api/:path*",
        destination: `${target}/api/:path*`,
      },
      {
        source: "/app/:path*",
        destination: `${target}/app/:path*`,
      },
      {
        source: "/assets/:path*",
        destination: `${target}/assets/:path*`,
      },
    ];
  },
};

export default nextConfig;
