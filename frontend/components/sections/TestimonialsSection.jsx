'use client';

import React from 'react';
import { motion } from 'framer-motion';
import TestimonialCard from '../ui/TestimonialCard';
import { fadeUp, motionGpu, motionViewport } from '@/lib/motion';

export default function TestimonialsSection({ dictionary, lang }) {
    return (
        <section className="py-24 bg-slate-50 dark:bg-slate-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={motionViewport}
                    className={`text-center mb-16 ${motionGpu}`}
                >
                    <motion.div
                        className="inline-block px-4 py-1.5 rounded-full bg-plum-100 dark:bg-plum-900/30 text-plum-700 dark:text-plum-400 text-sm font-semibold mb-4"
                        whileHover={{ scale: 1.05 }}
                    >
                        {dictionary.testimonials.badge}
                    </motion.div>
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
                        {dictionary.testimonials.title} <span className="bg-gradient-to-r from-plum-700 to-plum-500 bg-clip-text text-transparent">{dictionary.testimonials.titleHighlight}</span>
                    </h2>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-6 items-start max-w-7xl mx-auto">
                    {dictionary.testimonials.items.map((testimonial, idx) => (
                        <TestimonialCard key={idx} testimonial={testimonial} idx={idx} lang={lang} dictionary={dictionary} />
                    ))}
                </div>
            </div>
        </section>
    );
}
