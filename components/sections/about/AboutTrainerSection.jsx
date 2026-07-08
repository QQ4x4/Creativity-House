'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Award, BookOpen, Briefcase, GraduationCap, Star } from 'lucide-react';

const fadeUp = {
    hidden: { opacity: 0, y: 35 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.13, delayChildren: 0.05 } },
};

const scaleUp = {
    hidden: { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 22 } },
};

// Icon map for credentials and expertise (positional — order matches JSON)
const credentialIcons = [GraduationCap, GraduationCap, BookOpen];
const expertiseIcons  = [Briefcase, Star, Award];

export default function AboutTrainerSection({ dictionary, lang }) {
    const t = dictionary.about_page.trainer;

    return (
        <section
            className="py-24 bg-gradient-to-br from-slate-50 to-plum-50/30 dark:from-slate-950 dark:to-plum-950/30"
            aria-labelledby="trainer-heading"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section header */}
                <motion.div
                    className="text-center mb-16"
                    variants={stagger}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '0px 0px -100px 0px' }}
                >
                    <motion.span variants={fadeUp} className="inline-block px-5 py-2 rounded-full bg-plum-50 dark:bg-plum-900/30 border border-plum-200 dark:border-plum-700 text-plum-700 dark:text-plum-300 text-sm font-semibold tracking-widest uppercase mb-4">
                        {t.badge}
                    </motion.span>
                    <motion.h2 variants={fadeUp} id="trainer-heading" className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                        {t.title}{' '}
                        <span className="bg-gradient-to-r from-plum-700 to-plum-500 bg-clip-text text-transparent">
                            {t.titleHighlight}
                        </span>
                    </motion.h2>
                </motion.div>

                {/* Trainer Card */}
                <motion.div
                    className="relative rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50"
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '0px 0px -100px 0px' }}
                >
                    {/* Top accent gradient */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-plum-700 via-plum-500 to-gold-500" />

                    <div className="grid lg:grid-cols-5 gap-0">
                        {/* Left — Avatar / Identity */}
                        <div className="lg:col-span-2 bg-gradient-to-br from-plum-950 via-plum-900 to-slate-900 p-10 flex flex-col items-center justify-center text-center">
                            <motion.div
                                whileHover={{ scale: 1.05, rotate: 2 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                className="w-36 h-36 rounded-3xl bg-gradient-to-br from-plum-500 to-gold-500 flex items-center justify-center text-white text-5xl font-extrabold shadow-2xl mb-6"
                            >
                                TE
                            </motion.div>
                            <h3 className="text-2xl font-extrabold text-white mb-2">
                                {t.name}
                            </h3>
                            <p className="text-gold-400 text-sm font-semibold leading-snug max-w-xs">
                                {t.jobTitle}
                            </p>

                            {/* Badges from dictionary */}
                            <div className="flex flex-wrap justify-center gap-2 mt-6">
                                {t.badges.map((badge) => (
                                    <span key={badge} className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/70 text-xs font-medium">
                                        {badge}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Right — Bio + Credentials */}
                        <div className="lg:col-span-3 p-10 flex flex-col justify-center gap-8">
                            {/* Bio */}
                            <div>
                                <h4 className="text-xs font-semibold tracking-widest uppercase text-plum-600 dark:text-plum-400 mb-3">
                                    {t.bio_label}
                                </h4>
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base">
                                    {t.bio}
                                </p>
                            </div>

                            {/* Credentials */}
                            <motion.div
                                variants={stagger}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: '0px 0px -100px 0px' }}
                            >
                                <h4 className="text-xs font-semibold tracking-widest uppercase text-plum-600 dark:text-plum-400 mb-4">
                                    {t.credentials_label}
                                </h4>
                                <div className="space-y-3">
                                    {t.credentials.map((label, i) => {
                                        const Icon = credentialIcons[i] ?? GraduationCap;
                                        return (
                                            <motion.div key={i} variants={scaleUp} className="flex items-center gap-3">
                                                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-plum-50 dark:bg-plum-900/40 flex items-center justify-center">
                                                    <Icon className="w-4 h-4 text-plum-600 dark:text-plum-400" aria-hidden="true" />
                                                </div>
                                                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{label}</span>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </motion.div>

                            {/* Expertise Tags */}
                            <div>
                                <h4 className="text-xs font-semibold tracking-widest uppercase text-plum-600 dark:text-plum-400 mb-4">
                                    {t.expertise_label}
                                </h4>
                                <div className="flex flex-wrap gap-3">
                                    {t.expertise.map((label, i) => {
                                        const Icon = expertiseIcons[i] ?? Award;
                                        return (
                                            <motion.span
                                                key={i}
                                                whileHover={{ scale: 1.05, y: -2 }}
                                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-plum-50 to-gold-50 dark:from-plum-900/40 dark:to-gold-900/20 border border-plum-200 dark:border-plum-700 text-plum-700 dark:text-plum-300 text-sm font-semibold cursor-default"
                                            >
                                                <Icon className="w-4 h-4" aria-hidden="true" />
                                                {label}
                                            </motion.span>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
