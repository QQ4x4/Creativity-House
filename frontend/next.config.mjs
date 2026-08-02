/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use alternate distDir — default `.next` is locked/corrupt on this Windows host
  // distDir: '.next-build',
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
