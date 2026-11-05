'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import MagneticButton from '../ui/MagneticButton';

const HERO_IMAGE_LIGHT = '/images/hero_images/creativity-house-hero-team-light.webp';
const HERO_IMAGE_DARK = '/images/hero_images/creativity-house-hero-team-dark.webp';

export default function HeroSection({ dictionary, lang }) {
    const isRTL = lang === 'ar';
    const coursesHref = `/${lang}/courses`;
    const contactHref = `/${lang}/course-inquiry`;
    const imageAlt =
        dictionary.hero.imageAlt ||
        (isRTL
            ? 'مدرب يعرض مخطط نمو على متدربة'
            : 'Trainer presenting a growth chart to a learner');

    return (
        <section
            id="home"
            className="relative min-h-screen flex items-center overflow-x-clip bg-slate-50 transition-colors duration-300 dark:bg-[#0e0a16]"
        >
            <div className="relative max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-32">
                <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-8">
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <motion.div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-200 bg-purple-50 text-sm font-semibold text-plum-800 mb-6 dark:border-white/20 dark:bg-white/10 dark:text-white dark:backdrop-blur-sm dark:font-normal"
                            whileHover={{ scale: 1.05, borderColor: 'rgba(212,175,55,0.5)' }}
                        >
                            <motion.div
                                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <Sparkles className="w-4 h-4 text-plum-600 dark:text-gold-400" />
                            </motion.div>
                            <span>{dictionary.hero.badge}</span>
                        </motion.div>

                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
                            <motion.span
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.8 }}
                                className="inline-block"
                            >
                                {dictionary.hero.title1}
                            </motion.span>
                            <motion.span
                                className="block bg-gradient-to-r from-plum-700 to-gold-600 dark:from-plum-400 dark:to-gold-400 bg-clip-text text-transparent"
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.8 }}
                            >
                                {dictionary.hero.title2}
                            </motion.span>
                        </h1>

                        <motion.p
                            className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-xl"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7, duration: 0.8 }}
                        >
                            {dictionary.hero.description}
                        </motion.p>

                        <motion.div
                            className="flex w-full max-w-sm flex-col items-start gap-4 sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:gap-6"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.9, duration: 0.6 }}
                        >
                            <MagneticButton className="w-full sm:w-auto">
                                <Link href={coursesHref} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-8 py-4 font-semibold text-white transition-all hover:gap-3 hover:shadow-2xl hover:shadow-plum-500/50 group sm:w-auto">
                                    {dictionary.hero.exploreServices} <ArrowRight className={`w-5 h-5 transition-transform chevron-flip ${isRTL ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                                </Link>
                            </MagneticButton>
                            <MagneticButton className="w-full sm:w-auto">
                                <Link href={contactHref} className="inline-flex w-full items-center justify-center rounded-full border border-plum-600 bg-transparent px-8 py-4 font-semibold text-plum-700 transition-all hover:bg-plum-50 dark:border-white/30 dark:bg-white/10 dark:text-white dark:backdrop-blur-sm dark:hover:border-gold-400/50 dark:hover:bg-white/20 sm:w-auto">
                                    {dictionary.hero.contactUs}
                                </Link>
                            </MagneticButton>
                        </motion.div>

                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full lg:overflow-visible"
                    >
                        <div className="relative mx-auto w-full max-w-[640px] lg:ml-auto lg:mr-0 lg:max-w-none lg:w-full lg:origin-right lg:scale-[1.25] lg:translate-x-40 rtl:lg:ml-0 rtl:lg:mr-auto rtl:lg:origin-left rtl:lg:-translate-x-16">
                            <Image
                                src={HERO_IMAGE_LIGHT}
                                alt={imageAlt}
                                width={3200}
                                height={1755}
                                priority
                                sizes="(min-width:1024px) 55vw, 100vw"
                                className="h-auto w-full object-contain dark:hidden"
                            />
                            <Image
                                src={HERO_IMAGE_DARK}
                                alt={imageAlt}
                                width={3200}
                                height={1755}
                                priority
                                sizes="(min-width:1024px) 55vw, 100vw"
                                className="hidden h-auto w-full object-contain dark:block"
                            />
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
