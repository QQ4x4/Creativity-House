'use client';

/**
 * Shared chrome for every Student Portal page: existing Header/Footer, the dark
 * plum gradient canvas, and the signed-in guard. Pages only render their own
 * content — the auth redirect and loading skeleton live here once.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/providers/AuthProvider';

export default function DashboardShell({
  dictionary,
  lang,
  children,
  showFooter = true,
  contentClassName = 'mx-auto w-full max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8',
}) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/${lang}/login`);
    }
  }, [isLoading, isAuthenticated, lang, router]);

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-gradient-to-br from-slate-950 via-plum-950 to-slate-900">
      <Header dictionary={dictionary} lang={lang} scrolled={scrolled} />

      <main className="flex-1">
        {isLoading || !isAuthenticated ? (
          <div className="flex min-h-[60vh] items-center justify-center pt-24">
            <Loader2 className="h-7 w-7 animate-spin text-gold-400" aria-hidden />
            <span className="sr-only">Loading</span>
          </div>
        ) : (
          <div className={contentClassName}>{children}</div>
        )}
      </main>

      {showFooter ? <Footer dictionary={dictionary} lang={lang} /> : null}
    </div>
  );
}
