'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2, LayoutDashboard, ShieldCheck } from 'lucide-react';
import PublicShell from '@/components/catalog/PublicShell';
import { fadeUp, motionGpu, motionViewport } from '@/lib/motion';

const FALLBACK = {
  en: {
    badge: 'Payment confirmed',
    title: "You're enrolled",
    subtitle: 'Thank you. Your course is now in My Courses — you can start learning right away.',
    cta: 'Go to My Courses',
    secureNote: 'Your payment was processed securely by Stripe. A receipt was sent to your email.',
  },
  ar: {
    badge: 'تم تأكيد الدفع',
    title: 'تم تسجيلك',
    subtitle: 'شكرًا لك. الدورة أصبحت في دوراتي — يمكنك البدء فورًا.',
    cta: 'الذهاب إلى دوراتي',
    secureNote: 'عُالج دفعك بأمان عبر Stripe. أُرسل إيصال إلى بريدك.',
  },
};

export default function PaymentSuccessClient({ dictionary, lang }) {
  const fallback = FALLBACK[lang] || FALLBACK.en;
  const labels = { ...fallback, ...(dictionary.paymentSuccess || {}) };

  return (
    <PublicShell dictionary={dictionary} lang={lang}>
      <section className="relative z-30 flex min-h-[70vh] items-center px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 start-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-plum-600/20 blur-3xl" />
          <div className="absolute bottom-0 end-0 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl" />
        </div>

        <motion.div
          className={`relative mx-auto w-full max-w-lg overflow-hidden rounded-3xl border border-gray-200 bg-white/80 p-8 text-center shadow-sm backdrop-blur-xl sm:p-10 dark:border-white/10 dark:bg-[#181124]/90 dark:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)] ${motionGpu}`}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={motionViewport}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-plum-700 via-plum-500 to-gold-500"
          />

          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 text-plum-700 dark:bg-gold-400/15 dark:text-gold-300">
            <CheckCircle2 className="h-8 w-8" aria-hidden />
          </span>

          <span className="mt-5 inline-flex rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-plum-800 dark:border-gold-400/30 dark:bg-gold-400/10 dark:text-gold-200">
            {labels.badge}
          </span>

          <h1 className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-white">{labels.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{labels.subtitle}</p>

          <Link
            href={`/${lang}/my-courses`}
            className="mt-8 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-6 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(126,34,206,0.65)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_16px_40px_-10px_rgba(212,175,55,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden />
            {labels.cta}
          </Link>

          <p className="mt-6 flex items-start justify-center gap-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" aria-hidden />
            <span>{labels.secureNote}</span>
          </p>
        </motion.div>
      </section>
    </PublicShell>
  );
}
