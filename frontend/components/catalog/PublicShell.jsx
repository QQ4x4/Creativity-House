'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function PublicShell({ dictionary, lang, children }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-gray-50 transition-colors duration-300 dark:bg-[#0e0a16]">
      <Header dictionary={dictionary} lang={lang} scrolled={scrolled} />
      <main className="flex-1">{children}</main>
      <Footer dictionary={dictionary} lang={lang} />
    </div>
  );
}
