'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon, User, BookOpen, LogOut, ChevronDown } from 'lucide-react';
import MagneticButton from '../ui/MagneticButton';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/providers/AuthProvider';

export default function Header({ dictionary, lang, scrolled }) {
    const isRTL = lang === 'ar';
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [hoveredNav, setHoveredNav] = useState(null);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);
    const { isDark, toggleTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { user, isLoading, isAuthenticated, logout } = useAuth();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!userMenuOpen) return undefined;

        const onPointerDown = (event) => {
            if (!userMenuRef.current?.contains(event.target)) {
                setUserMenuOpen(false);
            }
        };

        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [userMenuOpen]);

    const navLinks = [
        { name: dictionary.nav.home, href: `/${lang}/#home`, isPage: true },
        { name: dictionary.nav.services, href: `/${lang}/#services`, isPage: true },
        { name: dictionary.nav.about, href: `/${lang}/about`, isPage: true },
        { name: dictionary.nav.contact, href: `/${lang}/#contact`, isPage: true },
    ];

    const displayName = user?.first_name || user?.name || '';
    const initial = (displayName || 'U').charAt(0).toUpperCase();

    const AuthActions = ({ mobile = false }) => {
        if (isLoading) {
            return (
                <div
                    className={`h-10 w-28 animate-pulse rounded-full ${
                        scrolled ? 'bg-slate-200 dark:bg-slate-700' : 'bg-white/20'
                    } ${mobile ? 'mx-4 my-2' : ''}`}
                    aria-hidden
                />
            );
        }

        if (isAuthenticated) {
            if (mobile) {
                return (
                    <div className="space-y-2 border-t border-slate-200 px-4 pt-3 dark:border-slate-700">
                        <p className="px-0 py-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {displayName}
                        </p>
                        <Link
                            href={`/${lang}/profile`}
                            onClick={() => setIsMenuOpen(false)}
                            className="flex min-h-[44px] items-center gap-2 rounded-lg px-0 py-2 text-slate-700 dark:text-slate-300"
                        >
                            <User className="h-4 w-4" />
                            {dictionary.nav.myProfile}
                        </Link>
                        <Link
                            href={`/${lang}/my-courses`}
                            onClick={() => setIsMenuOpen(false)}
                            className="flex min-h-[44px] items-center gap-2 rounded-lg px-0 py-2 text-slate-700 dark:text-slate-300"
                        >
                            <BookOpen className="h-4 w-4" />
                            {dictionary.nav.myCourses}
                        </Link>
                        <button
                            type="button"
                            onClick={async () => {
                                setIsMenuOpen(false);
                                await logout();
                            }}
                            className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-0 py-2 text-start text-red-600 dark:text-red-400"
                        >
                            <LogOut className="h-4 w-4" />
                            {dictionary.nav.logout || dictionary.auth?.logout}
                        </button>
                    </div>
                );
            }

            return (
                <div className="relative" ref={userMenuRef}>
                    <button
                        type="button"
                        onClick={() => setUserMenuOpen((open) => !open)}
                        className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3 py-1.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50 ${
                            scrolled
                                ? 'border-slate-200 bg-white/80 text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100'
                                : 'border-white/20 bg-white/10 text-white hover:bg-white/15'
                        }`}
                        aria-expanded={userMenuOpen}
                        aria-haspopup="menu"
                    >
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-plum-600 to-gold-500 text-sm font-semibold text-white">
                            {initial}
                        </span>
                        <span className="max-w-[7rem] truncate text-sm font-medium">{displayName}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {userMenuOpen ? (
                            <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                                transition={{ duration: 0.18 }}
                                role="menu"
                                className={`absolute end-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-white/15 bg-[#0d0514]/90 p-1.5 shadow-2xl backdrop-blur-2xl ${
                                    isRTL ? 'origin-top-left' : 'origin-top-right'
                                }`}
                            >
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/70 to-transparent"
                                />
                                <Link
                                    href={`/${lang}/profile`}
                                    role="menuitem"
                                    onClick={() => setUserMenuOpen(false)}
                                    className="flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm text-white/90 transition-colors hover:bg-white/10"
                                >
                                    <User className="h-4 w-4 text-gold-300" />
                                    {dictionary.nav.myProfile}
                                </Link>
                                <Link
                                    href={`/${lang}/my-courses`}
                                    role="menuitem"
                                    onClick={() => setUserMenuOpen(false)}
                                    className="flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm text-white/90 transition-colors hover:bg-white/10"
                                >
                                    <BookOpen className="h-4 w-4 text-gold-300" />
                                    {dictionary.nav.myCourses}
                                </Link>
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={async () => {
                                        setUserMenuOpen(false);
                                        await logout();
                                    }}
                                    className="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3 text-start text-sm text-red-300 transition-colors hover:bg-white/10"
                                >
                                    <LogOut className="h-4 w-4" />
                                    {dictionary.nav.logout || dictionary.auth?.logout}
                                </button>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>
            );
        }

        if (mobile) {
            return (
                <>
                    <Link
                        href={`/${lang}/login`}
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-4 py-3 min-h-[44px] rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                    >
                        {dictionary.nav.login}
                    </Link>
                    <Link
                        href={`/${lang}/register`}
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-4 py-3 min-h-[44px] rounded-lg bg-gradient-to-r from-plum-700 to-plum-500 text-white font-medium text-center"
                    >
                        {dictionary.nav.register}
                    </Link>
                </>
            );
        }

        return (
            <>
                <Link
                    href={`/${lang}/login`}
                    className={`min-h-[44px] inline-flex items-center font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50 rounded-lg px-2 ${
                        scrolled
                            ? 'text-slate-700 dark:text-slate-300 hover:text-plum-600'
                            : 'text-white hover:text-gold-300'
                    }`}
                >
                    {dictionary.nav.login}
                </Link>
                <MagneticButton>
                    <Link href={`/${lang}/register`} className="min-h-[44px] inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-plum-700 to-plum-500 text-white rounded-full font-medium hover:shadow-lg hover:shadow-plum-500/30 transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50">
                        {dictionary.nav.register || dictionary.nav.getStarted}
                    </Link>
                </MagneticButton>
            </>
        );
    };

    return (
        <header>
            <nav className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg shadow-lg dark:shadow-slate-950/50' : 'bg-transparent'}`} aria-label="Main navigation">
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
                                        transition={{
                                            // Instant nav hover scale/blur — intentional (do not increase duration)
                                            duration: 0,
                                            ease: 'easeOut',
                                        }}
                                    >
                                        {link.isPage
                                            ? <Link href={link.href} className="inherit">{link.name}</Link>
                                            : <a href={link.href}>{link.name}</a>
                                        }
                                        {hoveredNav === link.name && (
                                            <motion.div
                                                layoutId="navUnderline"
                                                className="absolute -bottom-1 inset-x-0 h-0.5 bg-gold-400 rounded-full"
                                                initial={{ scaleX: 0 }}
                                                animate={{ scaleX: 1 }}
                                                transition={{ duration: 0.25 }}
                                            />
                                        )}
                                    </motion.span>
                                ))}
                            </div>
                            <LanguageSwitcher scrolled={scrolled} dictionary={dictionary} lang={lang} />
                            <AuthActions />
                            <motion.button
                                onClick={toggleTheme}
                                whileHover={{ scale: 1.2, rotate: 180 }}
                                whileTap={{ scale: 0.8 }}
                                transition={{ type: 'spring', stiffness: 300 }}
                                className={`p-2.5 min-h-[44px] min-w-[44px] rounded-full transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50 ${scrolled
                                    ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    : 'text-white hover:bg-white/20'
                                    }`}
                                aria-label="Toggle theme"
                            >
                                {mounted && (isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />)}
                            </motion.button>
                        </div>

                        <div className="flex items-center gap-2 md:hidden">
                            <LanguageSwitcher scrolled={scrolled} dictionary={dictionary} lang={lang} />
                            <motion.button
                                onClick={toggleTheme}
                                whileHover={{ scale: 1.2, rotate: 180 }}
                                whileTap={{ scale: 0.8 }}
                                className={`p-2.5 min-h-[44px] min-w-[44px] rounded-full transition-all cursor-pointer ${scrolled
                                    ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    : 'text-white hover:bg-white/20'
                                    }`}
                                aria-label="Toggle theme"
                            >
                                {mounted && (isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />)}
                            </motion.button>
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center cursor-pointer"
                                aria-label="Toggle menu"
                            >
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
                                                className="block px-4 py-3 min-h-[44px] rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-all duration-300"
                                            >
                                                {link.name}
                                              </Link>
                                            : <a
                                                href={link.href}
                                                onClick={() => setIsMenuOpen(false)}
                                                className="block px-4 py-3 min-h-[44px] rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-all duration-300"
                                              >
                                                {link.name}
                                              </a>
                                        }
                                    </motion.div>
                                ))}
                                <AuthActions mobile />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>
        </header>
    );
}
