'use client';

import { FIELD_LIMITS } from '@/lib/fieldLimits';

/**
 * Live character counter for textareas (e.g. "1950 / 2000").
 */
export default function CharacterCounter({
  value = '',
  max = FIELD_LIMITS.long,
  className = '',
}) {
  const length = String(value ?? '').length;
  const nearLimit = length >= max * 0.9;

  return (
    <p
      className={`mt-1.5 text-end text-xs tabular-nums ${
        nearLimit ? 'text-amber-400' : 'text-gray-500 dark:text-gray-400'
      } ${className}`}
      aria-live="polite"
    >
      {length} / {max}
    </p>
  );
}
