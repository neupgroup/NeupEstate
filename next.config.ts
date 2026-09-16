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
    // Property media is hosted remotely and must be served directly. Sending
    // it through Next's optimizer makes the app proxy the remote image and
    // can timeout when the upstream storage service is slow.
    unoptimized: true,
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
        hostname: 'api.propertyinnepal.com.np',
      },
      {
        protocol: 'https',
        hostname: '**.**',
      }
    ],
  },
};

export default nextConfig;
