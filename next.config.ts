
import type { NextConfig } from 'next/dist/server/config-shared';

const cspHeader = `
    default-src 'self';
    connect-src 'self' https://bagndvjulypekmcddkyn.supabase.co wss://bagndvjulypekmcddkyn.supabase.co;
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self' https://r2cdn.perplexity.ai;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`;


const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
   async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
       {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
