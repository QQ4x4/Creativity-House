/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use the default `.next` output directory. A custom `distDir` (e.g.
  // `.next-build`) on Windows causes aggressive file-locking (errno -4094
  // UNKNOWN) on compiled CSS under static/css/app/[lang]/layout.css and
  // contributes to Watchpack escaping the project boundary.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.qwenlm.ai',
      },
    ],
  },

  // Keep Watchpack scoped to the project. Only relative / filename patterns —
  // never absolute C:/… paths (those become the scan root on Windows).
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        followSymlinks: false,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/DumpStack.log.tmp',
          '**/pagefile.sys',
          '**/hiberfil.sys',
          '**/swapfile.sys',
        ],
      };
    }
    return config;
  },

  /**
   * Proxy Sanctum + API through this origin so XSRF cookies are first-party.
   * Local WAMP (BACKEND_URL=localhost) keeps talking to Laravel directly — no proxy.
   *
   * IMPORTANT: middleware.js must exclude `sanctum` from the i18n matcher,
   * otherwise /sanctum/csrf-cookie is redirected to /ar/sanctum/... and 404s.
   *
   * Vercel env (exact values — do NOT paste "KEY=value" into the value field):
   *   NEXT_PUBLIC_BACKEND_URL = https://creativity-house-production.up.railway.app
   *   NEXT_PUBLIC_API_URL     = /api
   */
  async rewrites() {
    const rawBackend =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'https://creativity-house-production.up.railway.app';

    const backendUrl = String(rawBackend)
      .trim()
      // Strip accidental KEY= paste into Vercel value field
      .replace(/^(?:NEXT_PUBLIC_[A-Z0-9_]+=)+/i, '')
      .replace(/\/+$/, '')
      .replace(/\/api\/v\d+$/i, '')
      .replace(/\/api$/i, '');

    // Relative /api only — need BACKEND_URL for rewrite destination
    if (!backendUrl || backendUrl.startsWith('/')) {
      return [];
    }

    // Local WAMP — browser talks to localhost:8000 directly
    if (/localhost|127\.0\.0\.1/i.test(backendUrl)) {
      return [];
    }

    // Any remote Laravel (Vercel production, preview, or local next dev → Railway)
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
  },
};

export default nextConfig;
