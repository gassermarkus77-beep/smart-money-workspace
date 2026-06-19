/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@finberg/ui', '@finberg/shared'],
  typescript: {
    // Don't fail the build on type errors in shared packages — they're checked
    // separately by pnpm typecheck in CI.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Same — lint runs in CI, not on every deploy.
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/proxy/smc/:path*',
        destination: `${process.env.NEXT_PUBLIC_SMC_URL ?? 'http://localhost:4050'}/v1/smc/:path*`,
      },
      {
        source: '/api/proxy/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
