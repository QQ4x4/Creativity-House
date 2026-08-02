'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, CheckCircle2, Send } from 'lucide-react';
import MagneticButton from '../ui/MagneticButton';

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

export default function ContactSection({ dictionary, lang }) {
    const isRTL = lang === 'ar';
    const fadeLeft = makeFadeLeft(isRTL);
    const fadeRight = makeFadeRight(isRTL);
    const hoverX = isRTL ? -5 : 5;

    const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
    const [formStatus, setFormStatus] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormStatus('sending');
        setTimeout(() => {
            setFormStatus('success');
            setFormData({ name: '', email: '', subject: '', message: '' });
            setTimeout(() => setFormStatus(''), 3000);
        }, 1500);
    };

    return (
        <section id="contact" className="py-24 bg-white dark:bg-slate-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-12">
                    <motion.div
                        variants={fadeLeft}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "0px 0px -100px 0px" }}
                    >
                        <motion.div
                            className="inline-block px-4 py-1.5 rounded-full bg-plum-100 dark:bg-plum-900/30 text-plum-700 dark:text-plum-400 text-sm font-semibold mb-4"
                            whileHover={{ scale: 1.05 }}
                        >
                            {dictionary.contact.badge}
                        </motion.div>
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
                            {dictionary.contact.title} <span className="bg-gradient-to-r from-plum-700 to-plum-500 bg-clip-text text-transparent">{dictionary.contact.titleHighlight}</span>
                        </h2>
                        <p className="text-lg text-slate-600 dark:text-slate-400 mb-10">
                            {dictionary.contact.description}
                        </p>

                        <div className="space-y-6">
                            {[
                                { icon: Mail, label: dictionary.contact.emailLabel, value: dictionary.contact.emailValue, href: 'mailto:info@creativity-house.com', iconBg: 'bg-plum-100 dark:bg-plum-900/30', iconColor: 'text-plum-600 dark:text-plum-400' },
                                { icon: Phone, label: dictionary.contact.phoneLabel, value: dictionary.contact.phoneValue, href: null, iconBg: 'bg-gold-100 dark:bg-plum-900/30', iconColor: 'text-plum-600 dark:text-gold-400' },
                                { icon: MapPin, label: dictionary.contact.visitLabel, value: dictionary.contact.visitValue, href: null, iconBg: 'bg-plum-100 dark:bg-plum-900/30', iconColor: 'text-plum-600 dark:text-plum-400' },
                            ].map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    className="flex items-start gap-4 group cursor-pointer"
                                    whileHover={{ x: hoverX }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                >
                                    <motion.div
                                        className={`w-12 h-12 rounded-2xl ${item.iconBg} flex items-center justify-center flex-shrink-0`}
                                        whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                                        transition={{ duration: 0.4 }}
                                    >
                                        <item.icon className={`w-6 h-6 ${item.iconColor}`} />
                                    </motion.div>
                                    <div>
                                        <div className="font-semibold text-slate-900 dark:text-white group-hover:text-plum-600 dark:group-hover:text-gold-400 transition-colors">{item.label}</div>
                                        {item.href ? (
                                            <a href={item.href} className="text-slate-600 dark:text-slate-400 hover:text-plum-600 dark:hover:text-plum-400 transition-colors">
                                                {item.value}
                                            </a>
                                        ) : (
                                            <div className="text-slate-600 dark:text-slate-400">{item.value}</div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.form
                        variants={fadeRight}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "0px 0px -100px 0px" }}
                        onSubmit={handleSubmit}
                        className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 md:p-10"
                    >
                        <div className="space-y-5">
                            {[
                                { label: dictionary.contact.form.name, type: 'text', key: 'name', placeholder: dictionary.contact.form.namePlaceholder },
                                { label: dictionary.contact.form.email, type: 'email', key: 'email', placeholder: dictionary.contact.form.emailPlaceholder },
                                { label: dictionary.contact.form.subject, type: 'text', key: 'subject', placeholder: dictionary.contact.form.subjectPlaceholder },
                            ].map((field, idx) => (
                                <motion.div
                                    key={field.key}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "0px 0px -100px 0px" }}
                                    transition={{ delay: idx * 0.1 }}
                                >
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{field.label}</label>
                                    <input
                                        type={field.type}
                                        required
                                        value={formData[field.key]}
                                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-plum-500 focus:ring-2 focus:ring-plum-500/20 outline-none transition-all bg-white dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 hover:border-plum-300 dark:hover:border-plum-600"
                                        placeholder={field.placeholder}
                                    />
                                </motion.div>
                            ))}

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "0px 0px -100px 0px" }}
                                transition={{ delay: 0.3 }}
                            >
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{dictionary.contact.form.message}</label>
                                <textarea
                                    required
                                    rows="4"
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 focus:border-plum-500 focus:ring-2 focus:ring-plum-500/20 outline-none transition-all bg-white dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 resize-none hover:border-plum-300 dark:hover:border-plum-600"
                                    placeholder={dictionary.contact.form.messagePlaceholder}
                                />
                            </motion.div>

                            <MagneticButton>
                                <motion.button
                                    type="submit"
                                    disabled={formStatus === 'sending'}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full px-8 py-4 bg-gradient-to-r from-plum-700 to-plum-500 text-white rounded-xl font-semibold hover:shadow-xl hover:shadow-plum-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                                >
                                    {formStatus === 'sending' ? (
                                        <motion.span
                                            animate={{ opacity: [1, 0.5, 1] }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                        >
                                            {dictionary.contact.form.sending}
                                        </motion.span>
                                    ) : formStatus === 'success' ? (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="flex items-center gap-2"
                                        >
                                            <CheckCircle2 className="w-5 h-5" /> {dictionary.contact.form.sent}
                                        </motion.span>
                                    ) : (
                                        <>
                                            {dictionary.contact.form.send} <Send className="w-5 h-5" />
                                        </>
                                    )}
                                </motion.button>
                            </MagneticButton>
                        </div>
                    </motion.form>
                </div>
            </div>
        </section>
    );
}
