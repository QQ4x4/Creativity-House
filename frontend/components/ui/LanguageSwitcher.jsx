'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export default function LanguageSwitcher({ scrolled, dictionary, lang }) {
    const router = useRouter();
    const pathname = usePathname();
    const isAr = lang === 'ar';

    const toggleLanguage = () => {
        // Switch between /en and /ar while keeping the hash if any exists
        const newLang = isAr ? 'en' : 'ar';
        const segments = pathname.split('/');
        segments[1] = newLang;
        const newPath = segments.join('/');
        const hash = window.location.hash;
        
        // Use document.cookie to set NEXT_LOCALE explicitly to remember preference
        document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
        
        router.push(`${newPath}${hash}`);
    };

    return (
        <motion.button
            onClick={toggleLanguage}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-full font-medium text-sm transition-all duration-300 cursor-pointer border ${
                scrolled
                    ? 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-plum-400 dark:hover:border-plum-500 hover:bg-plum-50 dark:hover:bg-plum-900/20 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm'
                    : 'border-white/25 text-white hover:border-gold-400/50 hover:bg-white/15 backdrop-blur-sm'
            }`}
            aria-label="Switch language"
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={lang}
                    initial={{ opacity: 0, y: 8, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.5 }}
                    className="flex items-center gap-1.5"
                >
                    <Languages className="w-4 h-4" />
                    <span>{dictionary.languageSwitcher.label}</span>
                </motion.div>
            </AnimatePresence>
        </motion.button>
    );
}
