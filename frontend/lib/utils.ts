import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * shadcn/ui class merger. Kept at the canonical `@/lib/utils` path so the
 * primitives in components/ui drop straight into nextcrm-app.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
