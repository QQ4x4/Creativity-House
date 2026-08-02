'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronRight } from 'lucide-react';
import TiltCard from './TiltCard';

const fadeUp = {
    hidden: { opacity: 0, y: 60, scale: 0.95 },
    visible: (i = 0) => ({
        opacity: 1, y: 0, scale: 1,
        transition: { duration: 1, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }
    }),
};

export default function TestimonialCard({ testimonial, idx, lang, dictionary }) {
    const isRTL = lang === 'ar';
    const [isExpanded, setIsExpanded] = useState(false);
    const wordLimit = 130;
    const isLong = testimonial.content.length > wordLimit;

    const displayContent = isExpanded
        ? testimonial.content
        : isLong
            ? testimonial.content.slice(0, wordLimit) + '...'
            : testimonial.content;

    return (
        <motion.div
            custom={idx}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "0px 0px -100px 0px" }}
        >
            <TiltCard className="relative bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-2xl dark:shadow-slate-950/20 transition-all duration-500 flex flex-col justify-between h-full" intensity={8}>
                <div>
                    <div className="flex gap-1 mb-6">
                        {[...Array(5)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0, rotate: -180 }}
                                whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                                viewport={{ once: true, margin: "0px 0px -100px 0px" }}
                                transition={{ delay: idx * 0.15 + i * 0.08, type: 'spring', stiffness: 300 }}
                            >
                                <Star className="w-5 h-5 fill-gold-400 text-gold-400" />
                            </motion.div>
                        ))}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed transition-all duration-300 text-sm">
                        "{displayContent}"
                    </p>
                    {isLong && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-plum-600 dark:text-plum-400 font-semibold hover:underline mb-6 cursor-pointer focus:outline-none flex items-center gap-1 text-sm group"
                        >
                            <span className="group-hover:tracking-wide transition-all duration-300">{isExpanded ? dictionary.testimonials.readLess : dictionary.testimonials.readMore}</span>
                            <ChevronRight className={`w-4 h-4 chevron-flip transition-transform duration-300 ${isExpanded ? 'rotate-90' : (isRTL ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1')}`} />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-700 mt-auto">
                    <motion.div
                        whileHover={{ scale: 1.15, rotate: 5 }}
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-plum-600 to-gold-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg"
                    >
                        {testimonial.name.charAt(0)}
                    </motion.div>
                    <div>
                        <div className="font-bold text-slate-900 dark:text-white leading-tight text-sm">{testimonial.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{testimonial.role}</div>
                    </div>
                </div>
            </TiltCard>
        </motion.div>
    );
}
