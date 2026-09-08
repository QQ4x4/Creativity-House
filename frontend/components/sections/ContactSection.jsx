'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import MagneticButton from '../ui/MagneticButton';
import { fadeUp, motionGpu, motionViewport } from '@/lib/motion';

export default function ContactSection({ dictionary, lang }) {
    const isRTL = lang === 'ar';
    const inquiryHref = `/${lang}/course-inquiry`;

    return (
        <section id="contact" className="bg-slate-50 py-24 dark:bg-slate-950">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={motionViewport}
                    className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 via-plum-950 to-black p-8 text-center shadow-2xl shadow-plum-950/40 backdrop-blur-xl md:p-16 ${motionGpu}`}
                >
                    {/* Decorative glows */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -start-16 -top-16 h-56 w-56 rounded-full bg-plum-500/25 blur-[100px]"
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -bottom-20 -end-10 h-64 w-64 rounded-full bg-gold-500/20 blur-[110px]"
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 opacity-[0.08]"
                        style={{
                            backgroundImage:
                                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)',
                            backgroundSize: '22px 22px',
                        }}
                    />

                    <div className="relative z-10">
                        <motion.div
                            className="mb-5 inline-flex rounded-full border border-gold-400/25 bg-gold-400/10 px-4 py-1.5 text-sm font-semibold text-gold-300 shadow-[0_0_24px_rgba(212,175,55,0.15)]"
                            whileHover={{ scale: 1.05 }}
                        >
                            {dictionary.contact.badge}
                        </motion.div>

                        <h2 className="mb-5 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-[3.25rem] lg:leading-tight">
                            {dictionary.contact.title}{' '}
                            <span className="bg-gradient-to-r from-plum-400 via-gold-300 to-gold-400 bg-clip-text text-transparent">
                                {dictionary.contact.titleHighlight}
                            </span>
                        </h2>

                        <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                            {dictionary.contact.description}
                        </p>

                        <MagneticButton>
                            <Link
                                href={inquiryHref}
                                className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-8 py-4 font-semibold text-white shadow-lg shadow-plum-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:from-plum-600 hover:to-plum-400 hover:shadow-xl hover:shadow-plum-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50"
                            >
                                {dictionary.contact.ctaButton}
                                <ArrowRight
                                    className={`h-5 w-5 transition-transform duration-300 chevron-flip ${
                                        isRTL
                                            ? 'group-hover:-translate-x-1'
                                            : 'group-hover:translate-x-1'
                                    }`}
                                    aria-hidden
                                />
                            </Link>
                        </MagneticButton>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
