'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import MagneticButton from '../ui/MagneticButton';
import TiltCard from '../ui/TiltCard';
import { images } from '@/config/site';

export default function HeroSection({ dictionary, lang }) {
    const isRTL = lang === 'ar';

    return (
        <section id="home" className="relative min-h-screen flex items-center overflow-hidden bg-slate-900">
            <div className="absolute inset-0">
                <motion.img
                    src={images.hero}
                    alt="Creativity House — digital excellence in IT solutions"
                    width="1920"
                    height="1080"
                    fetchPriority="high"
                    className="w-full h-full object-cover opacity-40"
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-plum-900/80 to-plum-950/80" />
            </div>

            {/* Floating particles — CSS animated, deferred until idle for better LCP/INP */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 rounded-full bg-gold-400/30 deferred-particle"
                        style={{
                            left: `${15 + i * 15}%`,
                            top: `${20 + (i % 3) * 25}%`,
                            animationDelay: `${i * 0.5}s`,
                            animationDuration: `${4 + i}s`,
                        }}
                    />
                ))}
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <motion.div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm mb-6"
                            whileHover={{ scale: 1.05, borderColor: 'rgba(212,175,55,0.5)' }}
                        >
                            <motion.div
                                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <Sparkles className="w-4 h-4 text-gold-400" />
                            </motion.div>
                            <span>{dictionary.hero.badge}</span>
                        </motion.div>

                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
                            <motion.span
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.8 }}
                                className="inline-block"
                            >
                                {dictionary.hero.title1}
                            </motion.span>
                            <motion.span
                                className="block bg-gradient-to-r from-plum-400 to-gold-400 bg-clip-text text-transparent"
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.8 }}
                            >
                                {dictionary.hero.title2}
                            </motion.span>
                        </h1>

                        <motion.p
                            className="text-lg text-slate-300 mb-8 max-w-xl"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7, duration: 0.8 }}
                        >
                            {dictionary.hero.description}
                        </motion.p>

                        <motion.div
                            className="flex flex-wrap gap-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.9, duration: 0.6 }}
                        >
                            <MagneticButton>
                                <a href="#services" className="px-8 py-4 bg-gradient-to-r from-plum-700 to-plum-500 text-white rounded-full font-semibold hover:shadow-2xl hover:shadow-plum-500/50 transition-all flex items-center gap-2 hover:gap-3 group">
                                    {dictionary.hero.exploreServices} <ArrowRight className={`w-5 h-5 transition-transform chevron-flip ${isRTL ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                                </a>
                            </MagneticButton>
                            <MagneticButton>
                                <a href="#contact" className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-white rounded-full font-semibold hover:bg-white/20 hover:border-gold-400/50 transition-all">
                                    {dictionary.hero.contactUs}
                                </a>
                            </MagneticButton>
                        </motion.div>

                        <motion.div
                            className="flex items-center gap-8 mt-12 pt-8 border-t border-white/20"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.1, duration: 0.8 }}
                        >
                            {[
                                { val: dictionary.hero.projectsValue, lab: dictionary.hero.projectsLabel },
                                { val: dictionary.hero.clientsValue, lab: dictionary.hero.clientsLabel },
                                { val: dictionary.hero.yearsValue, lab: dictionary.hero.yearsLabel },
                            ].map((s, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ scale: 1.1, y: -5 }}
                                    transition={{ type: 'spring', stiffness: 400 }}
                                >
                                    <div className="text-3xl font-bold text-white">{s.val}</div>
                                    <div className="text-sm text-slate-400">{s.lab}</div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.7, rotateY: isRTL ? 15 : -15 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="hidden lg:block"
                    >
                        <TiltCard className="relative" intensity={10}>
                            <motion.div
                                className="absolute -inset-4 bg-gradient-to-r from-plum-700 to-plum-500 rounded-3xl blur-3xl opacity-30"
                                animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.05, 1] }}
                                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                            />
                            <img src={images.crm} alt="CRM Dashboard preview" width="600" height="400" loading="lazy" decoding="async" className="relative rounded-2xl shadow-2xl" />
                        </TiltCard>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
