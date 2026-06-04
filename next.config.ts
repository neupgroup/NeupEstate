import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  basePath: '/estate',

  turbopack: {
    root: process.cwd(),
  },

  typescript: {
    ignoreBuildErrors: false, // keep this strict in production
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
        hostname: 'neupcdn.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.neupcdn.com',
      },
      {
        protocol: 'https',
        hostname: '**.**',
      }
    ],
  },
};

export default nextConfig;