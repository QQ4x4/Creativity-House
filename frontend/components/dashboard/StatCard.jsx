'use client';

import { motion } from 'framer-motion';
import GlassPanel from './GlassPanel';
import { motionGpu, motionViewport } from '@/lib/motion';

const TONES = {
  purple: {
    icon: 'text-purple-300',
    iconBg: 'bg-purple-500/15 shadow-[0_0_20px_rgba(168,85,247,0.28)]',
    value: 'text-white',
  },
  gold: {
    icon: 'text-gold-300',
    iconBg: 'bg-gold-400/15 shadow-[0_0_20px_rgba(212,175,55,0.3)]',
    value: 'text-white',
  },
  emerald: {
    icon: 'text-emerald-300',
    iconBg: 'bg-emerald-400/15 shadow-[0_0_20px_rgba(52,211,153,0.28)]',
    value: 'text-white',
  },
};

/**
 * Summary stat tile. `value` is pre-formatted by the caller so no locale
 * formatting happens during render (keeps SSR and client markup identical).
 */
export default function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  hint,
  tone = 'purple',
  index = 0,
  isLoading = false,
}) {
  const palette = TONES[tone] || TONES.purple;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={motionViewport}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className={motionGpu}
    >
      <GlassPanel glow className="h-full">
        <div className="flex items-start gap-4">
          <span
            className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${palette.iconBg}`}
            aria-hidden
          >
            {Icon ? <Icon className={`h-6 w-6 ${palette.icon}`} strokeWidth={1.8} /> : null}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-400">{label}</p>

            {isLoading ? (
              <div className="mt-2 h-8 w-20 animate-pulse rounded-lg bg-white/10" />
            ) : (
              <p className={`mt-1 flex items-baseline gap-1.5 ${palette.value}`}>
                <span className="text-3xl font-bold tabular-nums leading-none">{value}</span>
                {suffix ? (
                  <span className="text-sm font-medium text-gray-400">{suffix}</span>
                ) : null}
              </p>
            )}

            {hint ? <p className="mt-1.5 text-xs text-gray-500">{hint}</p> : null}
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
}
