'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon } from 'lucide-react';
import MagneticButton from '../ui/MagneticButton';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import { useTheme } from '@/hooks/useTheme';

export default function Header({ dictionary, lang, scrolled }) {
    const isRTL = lang === 'ar';
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [hoveredNav, setHoveredNav] = useState(null);
    const { isDark, toggleTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const navLinks = [
        { name: dictionary.nav.home, href: `/${lang}/#home`, isPage: true },
        { name: dictionary.nav.services, href: `/${lang}/#services`, isPage: true },
        { name: dictionary.nav.about, href: `/${lang}/about`, isPage: true },
        { name: dictionary.nav.contact, href: `/${lang}/#contact`, isPage: true },
    ];

    return (
        <header>
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg shadow-lg dark:shadow-slate-950/50' : 'bg-transparent'}`} aria-label="Main navigation">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <motion.a
                            href="#home"
                            className="flex items-center group"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <img
                                src="/logo.png"
                                alt="Creativity House Logo"
                                width="160"
                                height="64"
                                className={`h-16 w-auto object-contain transition-all duration-300 ${scrolled ? 'dark:brightness-0 dark:invert' : 'brightness-0 invert'}`}
                            />
                        </motion.a>

                        <div className="hidden md:flex items-center gap-8">
                            <div
                                className="flex items-center gap-8"
                                onMouseLeave={() => setHoveredNav(null)}
                            >
                                {navLinks.map((link) => (
                                    <motion.span
                                        key={link.href}
                                        onMouseEnter={() => setHoveredNav(link.name)}
                                        className={`font-medium transition-all duration-300 relative cursor-pointer ${scrolled ? 'text-slate-700 dark:text-slate-300' : 'text-white'} ${hoveredNav === link.name ? '!text-gold-400' : ''}`}
                                        animate={{
                                            scale: hoveredNav === null ? 1 : hoveredNav === link.name ? 1.2 : 0.9,
                                            filter: hoveredNav === null ? 'blur(0px)' : hoveredNav === link.name ? 'blur(0px)' : 'blur(3px)',
                                            opacity: hoveredNav === null ? 1 : hoveredNav === link.name ? 1 : 0.4,
                                        }}
                                        transition={{ duration: 0, ease: 'easeOut' }}
                                    >
                                        {link.isPage
                                            ? <Link href={link.href} className="inherit">{link.name}</Link>
                                            : <a href={link.href}>{link.name}</a>
                                        }
                                        {hoveredNav === link.name && (
                                            <motion.div
                                                layoutId="navUnderline"
                                                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gold-400 rounded-full"
                                                initial={{ scaleX: 0 }}
                                                animate={{ scaleX: 1 }}
                                                transition={{ duration: 0.25 }}
                                            />
                                        )}
                                    </motion.span>
                                ))}
                            </div>
                            <LanguageSwitcher scrolled={scrolled} dictionary={dictionary} lang={lang} />
                            <motion.button
                                onClick={toggleTheme}
                                whileHover={{ scale: 1.2, rotate: 180 }}
                                whileTap={{ scale: 0.8 }}
                                transition={{ type: 'spring', stiffness: 300 }}
                                className={`p-2.5 rounded-full transition-all cursor-pointer ${scrolled
                                    ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    : 'text-white hover:bg-white/20'
                                    }`}
                                aria-label="Toggle theme"
                            >
                                {mounted && (isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />)}
                            </motion.button>
                            <MagneticButton>
                                <Link href={`/${lang}/#contact`} className="px-6 py-2.5 bg-gradient-to-r from-plum-700 to-plum-500 text-white rounded-full font-medium hover:shadow-lg hover:shadow-plum-500/30 transition-all hover:scale-105 inline-block">
                                    {dictionary.nav.getStarted}
                                </Link>
                            </MagneticButton>
                        </div>

                        <div className="flex items-center gap-2 md:hidden">
                            <LanguageSwitcher scrolled={scrolled} dictionary={dictionary} lang={lang} />
                            <motion.button
                                onClick={toggleTheme}
                                whileHover={{ scale: 1.2, rotate: 180 }}
                                whileTap={{ scale: 0.8 }}
                                className={`p-2.5 rounded-full transition-all cursor-pointer ${scrolled
                                    ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    : 'text-white hover:bg-white/20'
                                    }`}
                                aria-label="Toggle theme"
                            >
                                {mounted && (isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />)}
                            </motion.button>
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="cursor-pointer" aria-label="Toggle menu">
                                {isMenuOpen ? (
                                    <X className={`w-6 h-6 ${scrolled ? 'text-slate-900 dark:text-white' : 'text-white'}`} />
                                ) : (
                                    <Menu className={`w-6 h-6 ${scrolled ? 'text-slate-900 dark:text-white' : 'text-white'}`} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden bg-white dark:bg-slate-900 border-t dark:border-slate-700"
                        >
                            <div className="px-4 py-4 space-y-2">
                                {navLinks.map((link, idx) => (
                                    <motion.div
                                        key={link.href}
                                        initial={{ opacity: 0, x: isRTL ? 30 : -30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.08 }}
                                    >
                                        {link.isPage
                                            ? <Link
                                                href={link.href}
                                                onClick={() => setIsMenuOpen(false)}
                                                className="block px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-all duration-300"
                                            >
                                                {link.name}
                                              </Link>
                                            : <a
                                                href={link.href}
                                                onClick={() => setIsMenuOpen(false)}
                                                className="block px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-all duration-300"
                                              >
                                                {link.name}
                                              </a>
                                        }
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>
        </header>
    );
}
