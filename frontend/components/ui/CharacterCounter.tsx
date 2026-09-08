'use client';

import { FIELD_LIMITS } from '@/lib/fieldLimits';

type CharacterCounterProps = {
  value?: string;
  /** Maximum allowed length — any positive number, not a fixed literal. */
  max?: number;
  className?: string;
};

/**
 * Live character counter for textareas (e.g. "1950 / 2000").
 */
export default function CharacterCounter({
  value = '',
  max = FIELD_LIMITS.long as number,
  className = '',
}: CharacterCounterProps) {
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
