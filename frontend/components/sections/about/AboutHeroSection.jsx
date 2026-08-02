'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Target, Eye } from 'lucide-react';

const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};

const scaleUp = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.6, type: 'spring', stiffness: 180, damping: 20 } },
};

export default function AboutHeroSection({ dictionary, lang }) {
    const t = dictionary.about_page.hero;

    const visionMission = [
        {
            icon: Eye,
            title: t.vision.title,
            text: t.vision.text,
            gradient: 'from-plum-700 to-plum-500',
            iconBg: 'bg-plum-100 dark:bg-plum-900/40',
            iconColor: 'text-plum-600 dark:text-plum-400',
        },
        {
            icon: Target,
            title: t.mission.title,
            text: t.mission.text,
            gradient: 'from-gold-600 to-gold-400',
            iconBg: 'bg-gold-100 dark:bg-gold-900/40',
            iconColor: 'text-gold-600 dark:text-gold-400',
        },
    ];

    return (
        <section
            className="relative pt-32 pb-24 bg-gradient-to-br from-slate-900 via-plum-950 to-slate-900 overflow-hidden"
            aria-labelledby="about-hero-heading"
        >
            {/* Background orbs */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-plum-600/10 blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gold-500/10 blur-3xl animate-pulse delay-1000" />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Heading */}
                <motion.div
                    className="text-center max-w-4xl mx-auto mb-20"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div variants={fadeUp}>
                        <span className="inline-block px-5 py-2 rounded-full bg-white/10 border border-white/20 text-gold-400 text-sm font-semibold tracking-widest uppercase mb-6">
                            {t.badge}
                        </span>
                    </motion.div>
                    <motion.h1
                        id="about-hero-heading"
                        variants={fadeUp}
                        className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6"
                    >
                        {t.title1}{' '}
                        <span className="bg-gradient-to-r from-gold-400 to-plum-400 bg-clip-text text-transparent">
                            {t.titleHighlight}
                        </span>
                    </motion.h1>
                    <motion.p variants={fadeUp} className="text-lg sm:text-xl text-slate-300 leading-relaxed">
                        {t.description}
                    </motion.p>
                </motion.div>

                {/* Stats Row */}
                <motion.div
                    className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mb-24"
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '0px 0px -100px 0px' }}
                >
                    {t.stats.map((stat, i) => (
                        <motion.div
                            key={i}
                            variants={scaleUp}
                            className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
                        >
                            <div className="text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-gold-400 to-plum-400 bg-clip-text text-transparent mb-2">
                                {stat.value}
                            </div>
                            <div className="text-slate-400 text-sm font-medium">{stat.label}</div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Vision / Mission Cards */}
                <motion.div
                    className="grid md:grid-cols-2 gap-8"
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '0px 0px -100px 0px' }}
                >
                    {visionMission.map(({ icon: Icon, title, text, gradient, iconBg, iconColor }) => (
                        <motion.div
                            key={title}
                            variants={fadeUp}
                            whileHover={{ y: -8 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className="relative p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden group"
                        >
                            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} opacity-80`} />
                            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${iconBg} mb-6`}>
                                <Icon className={`w-7 h-7 ${iconColor}`} />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
                            <p className="text-slate-300 leading-relaxed">{text}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
