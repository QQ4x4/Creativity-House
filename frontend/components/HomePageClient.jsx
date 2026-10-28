'use client';

import React, { useState, useEffect } from 'react';

import Header from './layout/Header';
import Footer from './layout/Footer';
import ThirdPartyScripts from './future/ThirdPartyScripts';
import AIChatbotWrapper from './future/AIChatbotWrapper';

import HeroSection from './sections/HeroSection';
import StatsSection from './sections/StatsSection';
import ServicesSection from './sections/ServicesSection';
import AboutSection from './sections/AboutSection';
import TestimonialsSection from './sections/TestimonialsSection';
import ContactSection from './sections/ContactSection';

export default function HomePageClient({ dictionary, lang }) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Check initial state
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <Header dictionary={dictionary} lang={lang} scrolled={scrolled} />
            
            <main>
                <HeroSection dictionary={dictionary} lang={lang} />
                <StatsSection dictionary={dictionary} />
                <ServicesSection dictionary={dictionary} lang={lang} />
                <AboutSection dictionary={dictionary} />
                <TestimonialsSection dictionary={dictionary} lang={lang} />
                <ContactSection dictionary={dictionary} lang={lang} />
            </main>

            <Footer dictionary={dictionary} lang={lang} />

            {/* Future wrappers for analytics and integrations — browser-only load deferred inside */}
            <ThirdPartyScripts />
            <AIChatbotWrapper />
        </div>
    );
}
