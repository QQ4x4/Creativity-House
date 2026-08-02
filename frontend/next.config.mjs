/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use alternate distDir — default `.next` is locked/corrupt on this Windows host
  // distDir: '.next-build',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.qwenlm.ai',
      },
    ],
  },

  /**
   * Production (Vercel): proxy Sanctum + API through this origin so XSRF cookies
   * are first-party. Local WAMP keeps talking to localhost:8000 directly.
   *
   * IMPORTANT: middleware.js must exclude `sanctum` from the i18n matcher,
   * otherwise /sanctum/csrf-cookie is redirected to /ar/sanctum/... and 404s.
   */
  async rewrites() {
    const backendUrl = (
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'https://creativity-house-production.up.railway.app'
    ).replace(/\/+$/, '');

    const isLocalBackend = /localhost|127\.0\.0\.1/i.test(backendUrl);
    if (isLocalBackend) {
      return [];
    }

    // Vercel production / `next start` against Railway
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
      return [
        {
          source: '/sanctum/csrf-cookie',
          destination: `${backendUrl}/sanctum/csrf-cookie`,
        },
        {
          source: '/sanctum/:path*',
          destination: `${backendUrl}/sanctum/:path*`,
        },
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`,
        },
      ];
    }

    return [];
  },
};

export default nextConfig;
