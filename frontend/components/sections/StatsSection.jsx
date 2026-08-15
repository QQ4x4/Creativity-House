'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Users, Star, Award } from 'lucide-react';
import {
  motionGpu,
  motionViewport,
  scaleUp,
  staggerContainer,
} from '@/lib/motion';

const statIcons = [Globe, Users, Star, Award];

export default function StatsSection({ dictionary }) {
    return (
        <section className="py-20 bg-white dark:bg-slate-900" aria-label="Statistics">
            <motion.div
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={motionViewport}
            >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {dictionary.stats.items.map((stat, idx) => {
                        const StatIcon = statIcons[idx];
                        return (
                            <motion.div
                                key={idx}
                                custom={idx}
                                variants={scaleUp}
                                whileHover={{ scale: 1.1, y: -10 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                className={`text-center group cursor-pointer ${motionGpu}`}
                            >
                                <motion.div
                                    className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-plum-100 to-gold-100 dark:from-plum-900/40 dark:to-gold-900/40 mb-4 group-hover:shadow-lg group-hover:shadow-plum-500/20 transition-shadow"
                                    whileHover={{ rotate: [0, -10, 10, 0] }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <StatIcon className="w-7 h-7 text-plum-600 dark:text-plum-400 group-hover:scale-110 transition-transform" />
                                </motion.div>
                                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-plum-700 to-plum-500 bg-clip-text text-transparent mb-2">
                                    {stat.value}
                                </div>
                                <div className="text-slate-600 dark:text-slate-400 font-medium group-hover:text-plum-600 dark:group-hover:text-gold-400 transition-colors">
                                    {stat.label}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>
        </section>
    );
}
