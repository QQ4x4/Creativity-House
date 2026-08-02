'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/providers/AuthProvider';

export default function ProfileClient({ dictionary, lang }) {
  const router = useRouter();
  const t = dictionary.auth;
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/${lang}/login`);
    }
  }, [isLoading, isAuthenticated, lang, router]);

  return (
    <main className="relative flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden bg-gradient-to-br from-slate-950 via-plum-950 to-slate-900 px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-lg rounded-3xl border border-white/15 bg-white/10 p-6 text-start shadow-2xl backdrop-blur-xl sm:p-8"
      >
        <h1 className="text-2xl font-bold text-white">{t.profileTitle}</h1>
        <p className="mt-2 text-sm text-slate-300">{t.profileSubtitle}</p>

        {isLoading ? (
          <div className="mt-6 h-24 animate-pulse rounded-xl bg-white/5" />
        ) : user ? (
          <div className="mt-6 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
            <p>
              <span className="text-slate-400">{t.firstName}: </span>
              {user.first_name}
            </p>
            <p>
              <span className="text-slate-400">{t.lastName}: </span>
              {user.last_name}
            </p>
            <p dir="ltr">
              <span className="text-slate-400">{t.email}: </span>
              {user.email}
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/${lang}`}
            className="inline-flex min-h-[44px] items-center rounded-xl border border-white/20 px-4 text-sm font-medium text-white hover:bg-white/10"
          >
            {t.backHome}
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex min-h-[44px] items-center rounded-xl bg-gradient-to-r from-plum-700 to-plum-500 px-4 text-sm font-semibold text-white"
          >
            {t.logout}
          </button>
        </div>
      </motion.div>
    </main>
  );
}
