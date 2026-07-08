'use client';

import React, { useState, useEffect } from 'react';

import dynamic from 'next/dynamic';
import Header from './layout/Header';
import Footer from './layout/Footer';
import ThirdPartyScripts from './future/ThirdPartyScripts';
import AIChatbotWrapper from './future/AIChatbotWrapper';

import HeroSection from './sections/HeroSection';

const Skeleton = ({ h }) => <div className={`w-full ${h} bg-slate-100 dark:bg-slate-800 animate-pulse`} />;

const StatsSection = dynamic(() => import('./sections/StatsSection'), { ssr: false, loading: () => <Skeleton h="h-[300px]" /> });
const ServicesSection = dynamic(() => import('./sections/ServicesSection'), { ssr: false, loading: () => <Skeleton h="h-[800px]" /> });
const AboutSection = dynamic(() => import('./sections/AboutSection'), { ssr: false, loading: () => <Skeleton h="h-[600px]" /> });
const TestimonialsSection = dynamic(() => import('./sections/TestimonialsSection'), { ssr: false, loading: () => <Skeleton h="h-[600px]" /> });
const ContactSection = dynamic(() => import('./sections/ContactSection'), { ssr: false, loading: () => <Skeleton h="h-[800px]" /> });

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

            {/* Future wrappers for analytics and integrations */}
            <ThirdPartyScripts />
            <AIChatbotWrapper />
        </div>
    );
}
