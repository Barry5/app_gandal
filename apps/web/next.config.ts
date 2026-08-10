import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '**.cloudinary.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
  allowedDevOrigins: [
    '127.0.0.1',
    '192.168.137.1',
  ],
};

export default nextConfig;
