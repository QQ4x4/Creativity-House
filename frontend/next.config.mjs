/** @type {import('next').NextConfig} */

function backendImageRemotePatterns() {
  const patterns = [
    {
      protocol: 'https',
      hostname: 'image.qwenlm.ai',
    },
    {
      protocol: 'https',
      hostname: '**.up.railway.app',
    },
    {
      protocol: 'http',
      hostname: 'localhost',
      port: '8000',
    },
    {
      protocol: 'http',
      hostname: '127.0.0.1',
      port: '8000',
    },
  ];

  const raw =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    '';

  try {
    const cleaned = String(raw)
      .trim()
      .replace(/^(?:NEXT_PUBLIC_[A-Z0-9_]+=)+/i, '')
      .replace(/\/+$/, '')
      .replace(/\/api\/v\d+$/i, '')
      .replace(/\/api$/i, '');

    if (cleaned && /^https?:\/\//i.test(cleaned)) {
      const parsed = new URL(cleaned);
      patterns.push({
        protocol: parsed.protocol.replace(':', ''),
        hostname: parsed.hostname,
        ...(parsed.port ? { port: parsed.port } : {}),
      });
    }
  } catch {
    // Ignore malformed env URLs — static patterns above still apply.
  }

  return patterns;
}

const nextConfig = {
  // Use the default `.next` output directory. A custom `distDir` (e.g.
  // `.next-build`) on Windows causes aggressive file-locking (errno -4094
  // UNKNOWN) on compiled CSS under static/css/app/[lang]/layout.css and
  // contributes to Watchpack escaping the project boundary.
  images: {
    remotePatterns: backendImageRemotePatterns(),
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

  async headers() {
    const isDev = process.env.NODE_ENV === 'development';

    const scriptSrc = [
      "'self'",
      "'unsafe-inline'",
      'https://js.stripe.com',
      'https://www.google.com',
      'https://www.gstatic.com',
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      ...(isDev ? ["'unsafe-eval'"] : []),
    ].join(' ');

    const connectSrc = [
      "'self'",
      'https://api.stripe.com',
      'https://ipapi.co',
      'https://api.creativity-house.com',
      'https://www.google.com',
      'https://www.gstatic.com',
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      'https://region1.google-analytics.com',
      ...(isDev
        ? [
            'http://localhost:*',
            'http://127.0.0.1:*',
            'ws://localhost:*',
            'ws://127.0.0.1:*',
          ]
        : []),
    ].join(' ');

    const csp = [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src ${connectSrc}`,
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://iframe.mediadelivery.net https://www.google.com https://recaptcha.google.com https://www.googletagmanager.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
