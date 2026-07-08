/** @type {import('next').NextConfig} */
const nextConfig = {
  /* ─── Remote image domains (for external service/hero images) ─── */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.qwenlm.ai',
      },
    ],
  },
};

export default nextConfig;
