'use client';

import React, { useState, useEffect } from 'react';
import Header from './layout/Header';
import Footer from './layout/Footer';
import AboutHeroSection from './sections/about/AboutHeroSection';
import AboutSocialProofSection from './sections/about/AboutSocialProofSection';
import AboutTrainerSection from './sections/about/AboutTrainerSection';
import { AboutAtpSection } from './seo/SeoContentBlocks';
import FaqSection from './seo/FaqSection';

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
                <AboutAtpSection dictionary={dictionary} />
                <AboutSocialProofSection dictionary={dictionary} lang={lang} />
                <AboutTrainerSection dictionary={dictionary} lang={lang} />
                <FaqSection
                    title={dictionary.about_page?.faqTitle}
                    items={dictionary.about_page?.faq || []}
                />
            </main>

            <Footer dictionary={dictionary} lang={lang} />
        </div>
    );
}
