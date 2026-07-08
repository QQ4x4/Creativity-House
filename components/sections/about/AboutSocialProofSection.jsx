'use client';

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

/* ─── Client Logos ─── (Names are brand names — no translation needed) */
const clientLogos = [
    'INLPTA', 'UTHM', 'AMI', 'Hunt Oil Company', 'Mastermind',
    'Limkokwing University', 'HRDF', 'MAPMA', 'ExxonMobil',
    'DELL Technologies', 'Ministry of Defence Brunei', 'UPM', 'UTM',
    'MOL', 'LPC', 'GACA',
];

/* ─── Animation Variants ─── */
const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } },
};

/* ─── Logo Marquee ───
 * Bug 2 Fix: The marquee is always forced to dir="ltr" because brand logos
 * do not require RTL reading flow, and RTL inverts the X-axis causing
 * the animation to scroll off-screen in Arabic mode.
 */
function LogoMarquee() {
    const doubled = [...clientLogos, ...clientLogos];
    return (
        // Force LTR regardless of page dir to prevent RTL X-axis inversion
        <div dir="ltr" className="relative overflow-hidden py-4" aria-label="Our clients">
            {/* Fade edges */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-white dark:from-slate-900 to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-white dark:from-slate-900 to-transparent" />
            <motion.div
                className="flex gap-8 w-max"
                animate={{ x: ['0%', '-50%'] }}
                transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
            >
                {doubled.map((logo, i) => (
                    <div
                        key={i}
                        className="flex-shrink-0 flex items-center justify-center px-7 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 min-w-[160px] h-14 text-slate-600 dark:text-slate-300 font-semibold text-sm tracking-wide hover:border-plum-400 hover:text-plum-600 dark:hover:text-plum-400 transition-colors"
                    >
                        {logo}
                    </div>
                ))}
            </motion.div>
        </div>
    );
}

/* ─── Tilt Card ─── */
function TestimonialTiltCard({ name, role, quote }) {
    const cardRef = useRef(null);

    const handleMouseMove = (e) => {
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        card.style.transform = `perspective(800px) rotateX(${-y / 20}deg) rotateY(${x / 20}deg)`;
    };

    const handleMouseLeave = () => {
        if (cardRef.current) cardRef.current.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
    };

    const initials = name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();

    return (
        <motion.div
            variants={fadeUp}
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-xl hover:shadow-plum-500/10 transition-shadow duration-300 cursor-default"
            style={{ transformStyle: 'preserve-3d', transition: 'transform 0.15s ease-out' }}
        >
            <Quote className="w-8 h-8 text-plum-300 dark:text-plum-600 mb-4 opacity-60" aria-hidden="true" />
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-6 italic">"{quote}"</p>
            <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-plum-600 to-plum-400 flex items-center justify-center text-white text-sm font-bold">
                    {initials}
                </div>
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white text-sm">{name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{role}</div>
                </div>
            </div>
        </motion.div>
    );
}

/* ─── Main Component ─── */
export default function AboutSocialProofSection({ dictionary, lang }) {
    const t = dictionary.about_page.social_proof;

    return (
        <section className="py-24 bg-white dark:bg-slate-900" aria-labelledby="social-proof-heading">
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
                    <motion.h2 variants={fadeUp} id="social-proof-heading" className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
                        {t.title}{' '}
                        <span className="bg-gradient-to-r from-plum-700 to-plum-500 bg-clip-text text-transparent">
                            {t.titleHighlight}
                        </span>
                    </motion.h2>
                    <motion.p variants={fadeUp} className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        {t.description}
                    </motion.p>
                </motion.div>

                {/* Logo Marquee — always LTR, see component comment */}
                <div className="mb-20">
                    <LogoMarquee />
                </div>

                {/* Testimonials Grid */}
                <motion.div
                    className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
                    variants={stagger}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '0px 0px -100px 0px' }}
                >
                    {t.testimonials.map((testimonial, i) => (
                        <TestimonialTiltCard key={i} {...testimonial} />
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
