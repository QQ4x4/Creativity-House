'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { socialLinks } from '@/components/ui/SocialIcons';

const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const fadeUp = {
    hidden: { opacity: 0, y: 60, scale: 0.95 },
    visible: (i = 0) => ({
        opacity: 1, y: 0, scale: 1,
        transition: { duration: 1, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }
    }),
};

export default function Footer({ dictionary, lang }) {
    const isRTL = lang === 'ar';
    const hoverX = isRTL ? -5 : 5;

    return (
        <footer className="bg-slate-900 dark:bg-slate-950 text-white pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    className="grid md:grid-cols-4 gap-12 mb-12"
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "0px 0px -100px 0px" }}
                >
                    <motion.div className="md:col-span-2" variants={fadeUp}>
                        <div className="flex items-center mb-6">
                            <img
                                src="/logo.png"
                                alt="Creativity House Logo"
                                width="160"
                                height="64"
                                loading="lazy"
                                decoding="async"
                                className="h-16 w-auto object-contain brightness-0 invert"
                            />
                        </div>
                        <p className="text-slate-400 mb-6 max-w-md">
                            {dictionary.footer.description}
                        </p>
                        <div className="flex gap-3">
                            {socialLinks.map(({ icon: Icon, href }, idx) => (
                                <motion.a
                                    key={idx}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-gradient-to-br hover:from-plum-700 hover:to-plum-500 flex items-center justify-center transition-colors"
                                    whileHover={{ scale: 1.2, y: -5, rotate: 5 }}
                                    whileTap={{ scale: 0.9 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                >
                                    <Icon className="w-5 h-5" />
                                </motion.a>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div variants={fadeUp} custom={1}>
                        <h4 className="font-bold mb-4">{dictionary.footer.servicesTitle}</h4>
                        <ul className="space-y-2 text-slate-400">
                            {dictionary.footer.serviceLinks.map((item, idx) => (
                                <motion.li key={idx} whileHover={{ x: hoverX }} transition={{ duration: 0.2 }}>
                                    <a href="#services" className="hover:text-gold-400 transition-colors">{item}</a>
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>

                    <motion.div variants={fadeUp} custom={2}>
                        <h4 className="font-bold mb-4">{dictionary.footer.contactTitle}</h4>
                        <ul className="space-y-2 text-slate-400">
                            <li>{dictionary.contact.emailValue}</li>
                            <li>{dictionary.contact.phoneValue}</li>
                            <li>{dictionary.contact.visitValue}</li>
                        </ul>
                    </motion.div>
                </motion.div>

                <motion.div
                    className="mt-12 pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, margin: "0px" }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="text-sm text-slate-300">
                        {dictionary.footer.legal.copyright}
                    </div>
                    <div className="flex gap-6 text-sm text-slate-300">
                        <Link href={`/${lang}/#`} className="hover:text-white transition-colors">
                            {dictionary.footer.legal.privacy}
                        </Link>
                        <Link href={`/${lang}/#`} className="hover:text-white transition-colors">
                            {dictionary.footer.legal.terms}
                        </Link>
                    </div>
                </motion.div>
            </div>
        </footer>
    );
}
