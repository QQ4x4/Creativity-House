'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Award, Briefcase, GraduationCap, ScrollText, Star } from 'lucide-react';
import {
  fadeUpY35,
  motionGpu,
  motionViewport,
  scaleUpSoft,
  staggerAlt,
} from '@/lib/motion';
import PmiAtpBadge from './PmiAtpBadge';

const credentialIcons = [GraduationCap, GraduationCap, GraduationCap];
const expertiseIcons = [Briefcase, Star, Award, ScrollText];
const GAICC_MARK_SRC = '/images/gaicc-mark.png';
const GAICC_MARK_INTRINSIC = { width: 512, height: 512 };
/** Shared width so ATP badge + GAICC mark share the same left edge. */
const CREDENTIAL_MARK_WIDTH = 74;

export default function AboutTrainerSection({ dictionary, lang }) {
    const t = dictionary.about_page.trainer;
    const badgeAlt = dictionary.about_page.pmiBadgeAlt;

    return (
        <section
            className="py-24 bg-gradient-to-br from-slate-50 to-plum-50/30 dark:from-slate-950 dark:to-plum-950/30"
            aria-labelledby="trainer-heading"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    className="text-center mb-16"
                    variants={staggerAlt}
                    initial="hidden"
                    whileInView="visible"
                    viewport={motionViewport}
                >
                    <motion.span variants={fadeUpY35} className="inline-block px-5 py-2 rounded-full bg-plum-50 dark:bg-plum-900/30 border border-plum-200 dark:border-plum-700 text-plum-700 dark:text-plum-300 text-sm font-semibold tracking-widest uppercase mb-4">
                        {t.badge}
                    </motion.span>
                    <motion.h2 variants={fadeUpY35} id="trainer-heading" className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                        {t.title}{' '}
                        <span className="bg-gradient-to-r from-plum-700 to-plum-500 bg-clip-text text-transparent">
                            {t.titleHighlight}
                        </span>
                    </motion.h2>
                </motion.div>

                <motion.div
                    className={`relative rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 ${motionGpu}`}
                    variants={fadeUpY35}
                    initial="hidden"
                    whileInView="visible"
                    viewport={motionViewport}
                >
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-plum-700 via-plum-500 to-gold-500" />

                    <div className="grid lg:grid-cols-5 gap-0">
                        <div className="lg:col-span-2 bg-gradient-to-br from-plum-950 via-plum-900 to-slate-900 p-10 flex flex-col items-center justify-center text-center">
                            <motion.div
                                whileHover={{ scale: 1.05, rotate: 2 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                className="mb-6 h-44 w-44 overflow-hidden rounded-full bg-transparent"
                            >
                                <img
                                    src="/images/DR.jpg"
                                    alt={t.imageAlt || t.name}
                                    width={176}
                                    height={176}
                                    className="h-full w-full scale-[1.02] object-cover"
                                />
                            </motion.div>
                            <h3 className="text-2xl font-extrabold text-white mb-2">
                                {t.name}
                            </h3>
                            <p className="text-gold-400 text-sm font-semibold leading-snug max-w-xs">
                                {t.jobTitle}
                            </p>

                            {/* Credential lines: PMI ATP + GAICC */}
                            <div className="mt-5 flex w-full max-w-sm flex-col gap-3">
                                <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-3 sm:text-start">
                                    <div
                                        className="flex shrink-0 items-center justify-center"
                                        style={{ width: CREDENTIAL_MARK_WIDTH }}
                                    >
                                        <PmiAtpBadge alt={badgeAlt} size={60} className="shrink-0" />
                                    </div>
                                    <p className="text-xs leading-relaxed text-white/80 font-medium">
                                        {t.instructorCredential}
                                    </p>
                                </div>
                                <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-3 sm:text-start">
                                    <div
                                        className="flex shrink-0 items-center justify-center"
                                        style={{ width: CREDENTIAL_MARK_WIDTH }}
                                    >
                                        <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#603153]/5 ring-1 ring-[#603153]/20 dark:bg-white/10 dark:ring-white/20">
                                            <Image
                                                src={GAICC_MARK_SRC}
                                                alt={t.gaiccLogoAlt}
                                                width={GAICC_MARK_INTRINSIC.width}
                                                height={GAICC_MARK_INTRINSIC.height}
                                                className="h-11 w-11 object-contain"
                                                sizes="44px"
                                            />
                                        </span>
                                    </div>
                                    <p className="text-xs leading-relaxed text-white/80 font-medium">
                                        {t.gaiccCredential}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-wrap justify-center gap-2">
                                {t.badges.map((badge) => (
                                    <span key={badge} className="max-w-full px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/80 text-[11px] sm:text-xs font-medium leading-snug">
                                        {badge}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-3 p-10 flex flex-col justify-center gap-8">
                            <div>
                                <h4 className="text-xs font-semibold tracking-widest uppercase text-plum-600 dark:text-plum-400 mb-3">
                                    {t.bio_label}
                                </h4>
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base">
                                    {t.bio}
                                </p>
                            </div>

                            <motion.div
                                variants={staggerAlt}
                                initial="hidden"
                                whileInView="visible"
                                viewport={motionViewport}
                            >
                                <h4 className="text-xs font-semibold tracking-widest uppercase text-plum-600 dark:text-plum-400 mb-4">
                                    {t.credentials_label}
                                </h4>
                                <div className="space-y-3">
                                    {t.credentials.map((label, i) => {
                                        const Icon = credentialIcons[i] ?? GraduationCap;
                                        return (
                                            <motion.div key={i} variants={scaleUpSoft} className={`flex items-center gap-3 ${motionGpu}`}>
                                                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-plum-50 dark:bg-plum-900/40 flex items-center justify-center">
                                                    <Icon className="w-4 h-4 text-plum-600 dark:text-plum-400" aria-hidden="true" />
                                                </div>
                                                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{label}</span>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </motion.div>

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
