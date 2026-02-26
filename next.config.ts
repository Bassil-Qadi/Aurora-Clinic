import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // Simplifies serverless deployment on Netlify
  },
};

export default nextConfig;
