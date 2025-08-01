
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: [
    '@opentelemetry/sdk-node',
    '@opentelemetry/exporter-jaeger',
    'handlebars',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'media.istockphoto.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'archello.s3.eu-central-1.amazonaws.com',
      },
      // Keep a general wildcard for user-provided URLs in properties
      {
        protocol: 'https',
        hostname: '**.**',
      },
    ],
  },
};

export default nextConfig;
