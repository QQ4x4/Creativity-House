'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function AuthShell({
  lang,
  dictionary,
  title,
  subtitle,
  children,
  footer,
}) {
  const homeHref = `/${lang}`;

  return (
    <main className="relative flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden bg-gradient-to-br from-slate-950 via-plum-950 to-slate-900 px-4 py-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -start-20 top-24 h-72 w-72 rounded-full bg-plum-600/20 blur-3xl" />
        <div className="absolute -end-16 bottom-16 h-80 w-80 rounded-full bg-gold-500/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href={homeHref} className="inline-flex items-center">
            <img
              src="/logo.png"
              alt="Creativity House"
              width="140"
              height="56"
              className="h-12 w-auto object-contain brightness-0 invert"
            />
          </Link>
          <Link
            href={homeHref}
            className="min-h-[44px] inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 text-sm font-medium text-white/80 transition-colors duration-200 hover:bg-white/10 hover:text-white"
          >
            {dictionary.auth?.backHome || 'Home'}
          </Link>
        </div>

        <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl shadow-plum-950/40 backdrop-blur-xl sm:p-8">
          <div className="mb-6 text-start">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
            {subtitle ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{subtitle}</p>
            ) : null}
          </div>

          {children}

          {footer ? <div className="mt-6 text-start text-sm text-slate-300">{footer}</div> : null}
        </div>
      </motion.div>
    </main>
  );
}
