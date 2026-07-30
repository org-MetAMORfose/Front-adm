import type { NextConfig } from "next";

import { APP_BASE_PATH } from "./lib/basePath";

const nextConfig: NextConfig = {
  basePath: APP_BASE_PATH,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "**"
      },
      {
        protocol: "https",
        hostname: "**"
      }
    ]
  }
};

export default nextConfig;
