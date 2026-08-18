'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Loader2 } from 'lucide-react';

export default function CheckoutSuccessModal({
  open,
  labels,
  lang,
  orderId,
  requiresLogin,
  onClose,
}) {
  const router = useRouter();
  const nextHref = requiresLogin ? `/${lang}/login` : `/${lang}/my-courses`;

  useEffect(() => {
    if (!open) return undefined;

    const timer = window.setTimeout(() => {
      router.push(nextHref);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [open, nextHref, router]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label={labels.close}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-success-title"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md rounded-3xl border border-gray-200 bg-white/95 p-8 text-center shadow-2xl backdrop-blur-xl dark:border-purple-500/20 dark:bg-[#181124]/95"
          >
            <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-[0_0_28px_rgba(16,185,129,0.35)] dark:bg-emerald-500/15 dark:text-emerald-300">
              <BadgeCheck className="h-8 w-8" aria-hidden />
            </span>
            <h2 id="checkout-success-title" className="mt-5 text-2xl font-extrabold text-gray-900 dark:text-white">
              {labels.successTitle}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {requiresLogin ? labels.successLoginHint : labels.successSubtitle}
            </p>
            {orderId ? (
              <p className="mt-3 font-mono text-xs tabular-nums text-gray-500 dark:text-gray-400" dir="ltr">
                {labels.orderRef}: {orderId}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => router.push(nextHref)}
              className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-plum-700 to-plum-500 px-5 text-sm font-semibold text-white shadow-lg shadow-plum-500/30 transition-all duration-300 hover:from-plum-600 hover:to-plum-400"
            >
              {requiresLogin ? labels.signInToPay : labels.goToMyCourses}
              <ArrowRight className="chevron-flip h-4 w-4" aria-hidden />
            </button>

            <p className="mt-3 inline-flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {labels.redirecting}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
