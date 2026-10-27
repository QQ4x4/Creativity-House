'use client';

import { useEffect, useState } from 'react';
import { readVisitorTimeZone } from '@/lib/catalog/scheduleTime';

/**
 * Browser IANA timezone after mount (stable SSR → client handoff).
 */
export function useVisitorTimeZone() {
  const [mounted, setMounted] = useState(false);
  const [timeZone, setTimeZone] = useState('UTC');

  useEffect(() => {
    setTimeZone(readVisitorTimeZone() || 'UTC');
    setMounted(true);
  }, []);

  return { mounted, timeZone };
}
