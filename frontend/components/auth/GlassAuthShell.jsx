'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

/**
 * Premium glassmorphism auth shell — used by Register & OTP only.
 * Login continues to use AuthShell (untouched).
 */
export default function GlassAuthShell({
  lang,
  dictionary,
  title,
  subtitle,
  children,
  footer,
  headerIcon,
  /** When true, card is ~10% narrower than max-w-2xl (login only). */
  compact = false,
}) {
  const homeHref = `/${lang}`;
  const HeaderIcon = headerIcon === 'shield' ? ShieldCheck : null;
  // max-w-2xl = 42rem → 90% ≈ 37.8rem
  const widthClass = compact ? 'max-w-[37.8rem]' : 'max-w-2xl';

  return (
    <main className="relative flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden bg-gradient-to-br from-slate-950 via-plum-950 to-slate-900 px-4 py-14 sm:py-20">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -start-24 top-16 h-80 w-80 rounded-full bg-plum-600/25 blur-3xl" />
        <div className="absolute -end-20 bottom-10 h-96 w-96 rounded-full bg-gold-500/15 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/40 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={`relative z-10 w-full ${widthClass}`}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href={homeHref} className="inline-flex items-center">
            <img
              src="/logo.png"
              alt="Creativity House"
              width="200"
              height="80"
              className="h-16 w-auto object-contain brightness-0 invert sm:h-20"
            />
          </Link>
          <Link
            href={homeHref}
            className="inline-flex min-h-[44px] items-center rounded-full border border-white/15 bg-white/5 px-4 text-sm font-medium text-white/80 transition-colors duration-200 hover:bg-white/10 hover:text-white"
          >
            {dictionary.auth?.backHome || 'Home'}
          </Link>
        </div>

        <div className="relative rounded-[32px] p-px shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[32px] bg-gradient-to-b from-plum-500/70 via-gold-400/35 to-white/10 opacity-90"
          />
          <div className="relative overflow-visible rounded-[31px] border border-white/15 bg-[#0d0514]/70 p-6 backdrop-blur-3xl sm:p-8 md:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/80 to-transparent"
            />

            <div className="mb-8 text-start">
              {HeaderIcon ? (
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-gold-300">
                  <HeaderIcon className="h-6 w-6" aria-hidden />
                </div>
              ) : null}
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 text-base font-normal text-gray-400">{subtitle}</p>
              ) : null}
            </div>

            {children}

            {footer ? (
              <div className="mt-6 text-start text-sm text-gray-400">{footer}</div>
            ) : null}
          </div>
        </div>
      </motion.div>
    </main>
  );
}
