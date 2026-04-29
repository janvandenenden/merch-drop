import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.printful.com" },
      { protocol: "https", hostname: "*.b68fa29193be66763b4686f765930b36.r2.cloudflarestorage.com" },
    ],
  },
};

export default nextConfig;
