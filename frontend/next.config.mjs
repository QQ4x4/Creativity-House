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
   * are first-party. Local `next dev` (NODE_ENV=development) skips rewrites and
   * talks to http://localhost:8000 directly via NEXT_PUBLIC_* env.
   */
  async rewrites() {
    const backendUrl = (
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'https://creativity-house-production.up.railway.app'
    ).replace(/\/+$/, '');

    // Never proxy when developing against local WAMP / artisan serve.
    const isLocalBackend = /localhost|127\.0\.0\.1/i.test(backendUrl);
    if (isLocalBackend) {
      return [];
    }

    // Apply on Vercel production builds (and `next start` against Railway).
    if (process.env.NODE_ENV === 'production') {
      return [
        // Explicit CSRF route (avoids edge-case :path* matching issues)
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
