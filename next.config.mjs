/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // Simplifies serverless deployment on Netlify
  },
};

export default nextConfig;
