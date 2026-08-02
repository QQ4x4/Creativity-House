'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Shield, Zap, TrendingUp } from 'lucide-react';
import TiltCard from '../ui/TiltCard';

const featureIcons = [Sparkles, Shield, Zap, TrendingUp];

const fadeUp = {
    hidden: { opacity: 0, y: 60, scale: 0.95 },
    visible: (i = 0) => ({
        opacity: 1, y: 0, scale: 1,
        transition: { duration: 1, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }
    }),
};

const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const scaleUp = {
    hidden: { opacity: 0, scale: 0.7 },
    visible: (i = 0) => ({
        opacity: 1, scale: 1,
        transition: { duration: 1, delay: i * 0.1, type: 'spring', stiffness: 200 }
    }),
};

export default function AboutSection({ dictionary }) {
    return (
        <section id="about" className="py-24 bg-gradient-to-br from-slate-900 via-plum-900 to-plum-950 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
                <motion.div
                    className="absolute top-0 left-1/4 w-96 h-96 bg-plum-500 rounded-full blur-3xl"
                    animate={{ x: [-30, 30, -30], y: [-20, 20, -20] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold-500 rounded-full blur-3xl"
                    animate={{ x: [30, -30, 30], y: [20, -20, 20] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "0px 0px -100px 0px" }}
                    className="text-center mb-16"
                >
                    <motion.div
                        className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-semibold mb-4 border border-white/20"
                        whileHover={{ scale: 1.05, borderColor: 'rgba(212,175,55,0.5)' }}
                    >
                        {dictionary.about.badge}
                    </motion.div>
                    <h2 className="text-4xl md:text-5xl font-bold mb-4">
                        {dictionary.about.title} <span className="bg-gradient-to-r from-plum-400 to-gold-400 bg-clip-text text-transparent">{dictionary.about.titleHighlight}</span>
                    </h2>
                    <p className="text-lg text-slate-300 max-w-2xl mx-auto">
                        {dictionary.about.description}
                    </p>
                </motion.div>

                <motion.div
                    className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "0px 0px -100px 0px" }}
                >
                    {dictionary.about.features.map((feature, idx) => {
                        const FeatureIcon = featureIcons[idx];
                        return (
                            <motion.div
                                key={idx}
                                custom={idx}
                                variants={scaleUp}
                            >
                                <TiltCard
                                    className="relative p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-gold-400/30 transition-all duration-200 h-full"
                                    intensity={12}
                                >
                                    <motion.div
                                        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-plum-600 to-gold-500 flex items-center justify-center mb-6"
                                        whileHover={{ rotate: [0, -10, 10, -5, 0], scale: 1.1 }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        <FeatureIcon className="w-7 h-7 text-white" />
                                    </motion.div>
                                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                    <p className="text-slate-300 text-sm">{feature.description}</p>
                                </TiltCard>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </section>
    );
}
