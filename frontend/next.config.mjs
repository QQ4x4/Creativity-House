/** @type {import('next').NextConfig} */
const backendOrigin = (
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
).replace(/\/+$/, '');

const isLocalBackend = /localhost|127\.0\.0\.1/i.test(backendOrigin);

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
   * Production (Vercel): proxy Sanctum + API through the frontend origin so
   * XSRF-TOKEN / session cookies are first-party and readable by Axios.
   * Local WAMP: no rewrites — browser talks to localhost:8000 directly.
   */
  async rewrites() {
    if (isLocalBackend) {
      return [];
    }

    return [
      {
        source: '/sanctum/:path*',
        destination: `${backendOrigin}/sanctum/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
