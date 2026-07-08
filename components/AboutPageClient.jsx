'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Header from './layout/Header';
import Footer from './layout/Footer';
import AboutHeroSection from './sections/about/AboutHeroSection';

const AboutSocialProofSection = dynamic(
    () => import('./sections/about/AboutSocialProofSection'),
    { ssr: false, loading: () => <div className="w-full h-[600px] bg-slate-100 dark:bg-slate-800 animate-pulse" /> }
);

const AboutTrainerSection = dynamic(
    () => import('./sections/about/AboutTrainerSection'),
    { ssr: false, loading: () => <div className="w-full h-[500px] bg-slate-100 dark:bg-slate-800 animate-pulse" /> }
);

export default function AboutPageClient({ dictionary, lang }) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <Header dictionary={dictionary} lang={lang} scrolled={scrolled} />

            <main>
                <AboutHeroSection dictionary={dictionary} lang={lang} />
                <AboutSocialProofSection dictionary={dictionary} lang={lang} />
                <AboutTrainerSection dictionary={dictionary} lang={lang} />
            </main>

            <Footer dictionary={dictionary} lang={lang} />
        </div>
    );
}
