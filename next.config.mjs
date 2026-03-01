/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // Simplifies serverless deployment on Netlify
  },
  async headers() {
    return [
      {
        // All CSS files under _next/static
        source: "/_next/static/:path*.css",
        headers: [
          { key: "Content-Type", value: "text/css; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
