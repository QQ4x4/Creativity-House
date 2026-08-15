'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Circle } from 'lucide-react';

const SPECIAL_CHAR_REGEX = /[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?]/;

export const PASSWORD_RULES = [
  {
    id: 'length',
    test: (value) => value.length >= 8,
  },
  {
    id: 'uppercase',
    test: (value) => /[A-Z]/.test(value),
  },
  {
    id: 'lowercase',
    test: (value) => /[a-z]/.test(value),
  },
  {
    id: 'number',
    test: (value) => /[0-9]/.test(value),
  },
  {
    id: 'special',
    test: (value) => SPECIAL_CHAR_REGEX.test(value),
  },
];

const DEFAULT_LABELS = {
  title: 'Password requirements',
  strength: 'Strength',
  weak: 'Weak',
  fair: 'Fair',
  strong: 'Strong',
  veryStrong: 'Very strong',
  length: 'At least 8 characters',
  uppercase: 'One uppercase letter',
  lowercase: 'One lowercase letter',
  number: 'One number',
  special: 'One special character',
};

function getStrengthMeta(score, labels) {
  if (score <= 2) {
    return {
      label: labels.weak,
      barClass: 'from-red-500 to-rose-600',
      glowClass: 'shadow-red-500/30',
      width: `${Math.max(score, 1) * 20}%`,
    };
  }
  if (score === 3) {
    return {
      label: labels.fair,
      barClass: 'from-amber-500 to-yellow-500',
      glowClass: 'shadow-amber-500/30',
      width: '60%',
    };
  }
  if (score === 4) {
    return {
      label: labels.strong,
      barClass: 'from-emerald-400 to-teal-500',
      glowClass: 'shadow-emerald-400/30',
      width: '80%',
    };
  }
  return {
    label: labels.veryStrong,
    barClass: 'from-emerald-400 via-teal-400 to-purple-500',
    glowClass: 'shadow-emerald-400/40',
    width: '100%',
  };
}

/**
 * Real-time password checklist + strength bar.
 * Show when the password field is focused or already has a value.
 */
export default function PasswordRequirements({
  password = '',
  visible = false,
  labels: labelsProp,
  id = 'password-requirements',
}) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const value = String(password || '');

  const checks = useMemo(
    () =>
      PASSWORD_RULES.map((rule) => ({
        ...rule,
        met: rule.test(value),
        label: labels[rule.id] || rule.id,
      })),
    [value, labels]
  );

  const score = checks.filter((item) => item.met).length;
  const strength = getStrengthMeta(score, labels);
  const showBar = value.length > 0;

  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.div
          id={id}
          key="password-requirements"
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="mt-2 rounded-2xl border border-purple-500/20 bg-[#181124]/90 p-3.5 shadow-xl shadow-black/30 backdrop-blur-md sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {labels.title}
              </p>
              {showBar ? (
                <span
                  className={`text-xs font-semibold ${
                    score >= 5
                      ? 'text-emerald-300'
                      : score >= 4
                        ? 'text-teal-300'
                        : score === 3
                          ? 'text-amber-300'
                          : 'text-rose-300'
                  }`}
                >
                  {labels.strength}: {strength.label}
                </span>
              ) : null}
            </div>

            {/* Strength bar */}
            <div
              className="mb-3.5 h-1.5 overflow-hidden rounded-full bg-white/10"
              aria-hidden={!showBar}
            >
              <div
                className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out ${
                  showBar
                    ? `${strength.barClass} shadow-md ${strength.glowClass}`
                    : 'w-0'
                }`}
                style={{ width: showBar ? strength.width : '0%' }}
              />
            </div>

            <ul className="space-y-2">
              {checks.map((item) => (
                <li key={item.id}>
                  <motion.div
                    animate={item.met ? { scale: [1.05, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={`flex items-center gap-2.5 text-sm transition-all duration-300 ${
                      item.met ? 'text-emerald-400' : 'text-gray-400'
                    }`}
                  >
                    <span
                      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                        item.met
                          ? 'bg-emerald-400/15 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.35)]'
                          : 'bg-white/5 text-gray-500'
                      }`}
                      aria-hidden
                    >
                      {item.met ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      ) : (
                        <Circle className="h-3 w-3" strokeWidth={2} />
                      )}
                    </span>
                    <span className="leading-snug">{item.label}</span>
                    <span className="sr-only">
                      {item.met ? 'met' : 'not met'}
                    </span>
                  </motion.div>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
