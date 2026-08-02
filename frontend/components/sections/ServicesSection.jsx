'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Database, Kanban, Cloud, GraduationCap, CheckCircle2, ChevronRight } from 'lucide-react';
import TiltCard from '../ui/TiltCard';
import { images } from '@/config/site';

const serviceIcons = [Database, Kanban, Cloud, GraduationCap];
const serviceImages = [images.crm, images.pm, images.cloud, images.training];

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

function makeFadeLeft(isRTL) {
    const xVal = isRTL ? 80 : -80;
    return {
        hidden: { opacity: 0, x: xVal },
        visible: (i = 0) => ({
            opacity: 1, x: 0,
            transition: { duration: 1, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }
        }),
    };
}

function makeFadeRight(isRTL) {
    const xVal = isRTL ? -80 : 80;
    return {
        hidden: { opacity: 0, x: xVal },
        visible: (i = 0) => ({
            opacity: 1, x: 0,
            transition: { duration: 1, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }
        }),
    };
}

export default function ServicesSection({ dictionary, lang }) {
    const isRTL = lang === 'ar';
    const fadeLeft = makeFadeLeft(isRTL);
    const fadeRight = makeFadeRight(isRTL);
    const hoverX = isRTL ? -5 : 5;

    return (
        <section id="services" className="py-24 bg-slate-50 dark:bg-slate-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "0px 0px -100px 0px" }}
                    className="text-center mb-16"
                >
                    <motion.div
                        className="inline-block px-4 py-1.5 rounded-full bg-plum-100 dark:bg-plum-900/30 text-plum-700 dark:text-plum-400 text-sm font-semibold mb-4"
                        whileHover={{ scale: 1.05 }}
                    >
                        {dictionary.services.badge}
                    </motion.div>
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
                        {dictionary.services.title} <span className="bg-gradient-to-r from-plum-700 to-plum-500 bg-clip-text text-transparent">{dictionary.services.titleHighlight}</span>
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        {dictionary.services.description}
                    </p>
                </motion.div>

                <motion.div
                    className="grid md:grid-cols-2 gap-8"
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "0px 0px -100px 0px" }}
                >
                    {dictionary.services.items.map((service, idx) => {
                        const ServiceIcon = serviceIcons[idx];
                        return (
                            <motion.div
                                key={idx}
                                custom={idx}
                                variants={idx % 2 === 0 ? fadeLeft : fadeRight}
                            >
                                <TiltCard
                                    className="relative group bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl dark:shadow-slate-950/30 transition-all duration-500"
                                    intensity={6}
                                >
                                    <div className="relative h-64 overflow-hidden">
                                        <motion.img
                                            src={serviceImages[idx]}
                                            alt={service.title}
                                            width="600"
                                            height="256"
                                            loading="lazy"
                                            decoding="async"
                                            className="w-full h-full object-cover"
                                            whileHover={{ scale: 1.1 }}
                                            transition={{ duration: 0.7 }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                                        <motion.div
                                            className="absolute top-6 start-6 w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30"
                                            whileHover={{ rotate: 360, scale: 1.1 }}
                                            transition={{ duration: 0.6 }}
                                        >
                                            <ServiceIcon className="w-7 h-7 text-white" />
                                        </motion.div>
                                    </div>

                                    <div className="p-8">
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-plum-600 dark:group-hover:text-gold-400 transition-colors">{service.title}</h3>
                                        <p className="text-slate-600 dark:text-slate-400 mb-6">{service.description}</p>

                                        <div className="grid grid-cols-2 gap-3">
                                            {service.features.map((feature, fIdx) => (
                                                <motion.div
                                                    key={fIdx}
                                                    className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 hover:text-plum-700 dark:hover:text-gold-400 transition-colors"
                                                    whileHover={{ x: hoverX }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <CheckCircle2 className="w-4 h-4 text-plum-600 dark:text-plum-400 flex-shrink-0" />
                                                    <span>{feature}</span>
                                                </motion.div>
                                            ))}
                                        </div>

                                        <motion.button
                                            className="mt-6 flex items-center gap-2 text-plum-600 dark:text-plum-400 font-semibold"
                                            whileHover={{ x: hoverX, gap: '12px' }}
                                        >
                                            {dictionary.services.learnMore} <ChevronRight className="w-5 h-5 chevron-flip" />
                                        </motion.button>
                                    </div>
                                </TiltCard>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </section>
    );
}
