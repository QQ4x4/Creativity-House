'use client';

import { motion } from 'framer-motion';

const SIZES = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-3',
};

/**
 * Glowing completion bar. Width animates from 0 on mount so progress changes
 * read as movement, and the track keeps its height to avoid layout shift.
 */
export default function ProgressBar({
  value = 0,
  size = 'md',
  label,
  showValue = true,
  complete = false,
  className = '',
}) {
  const percentage = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={`w-full ${className}`}>
      {label || showValue ? (
        <div className="mb-1.5 flex items-center justify-between gap-3">
          {label ? (
            <span className="text-xs font-medium text-gray-400">{label}</span>
          ) : (
            <span />
          )}
          {showValue ? (
            <span
              className={`text-xs font-bold tabular-nums ${
                complete || percentage === 100 ? 'text-emerald-300' : 'text-gold-300'
              }`}
            >
              {percentage}%
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        className={`w-full overflow-hidden rounded-full bg-white/10 ${SIZES[size] || SIZES.md}`}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full rounded-full ${
            complete || percentage === 100
              ? 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
              : 'bg-gradient-to-r from-plum-500 via-purple-400 to-gold-400 shadow-[0_0_12px_rgba(212,175,55,0.45)]'
          }`}
        />
      </div>
    </div>
  );
}
