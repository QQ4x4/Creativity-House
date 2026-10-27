'use client';

import { useEffect, useState } from 'react';

/**
 * Shared ticking clock for all schedule countdowns on a page.
 *
 * - First paint returns null so SSR/hydration stay stable (no CLS).
 * - Tick every 1s only when `urgent` is true (< 24h to a start); else every 30s.
 * - Pauses while the document is hidden.
 *
 * @param {{ urgent?: boolean }} [options]
 * @returns {number|null} epoch ms, or null before mount
 */
export function useNow({ urgent = false } = {}) {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(Date.now());

    let timer = null;

    const clear = () => {
      if (timer != null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      clear();
      const interval = urgent ? 1000 : 30_000;
      timer = window.setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        setNow(Date.now());
      }, interval);
    };

    const onVisibility = () => {
      if (document.hidden) {
        clear();
      } else {
        setNow(Date.now());
        start();
      }
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clear();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [urgent]);

  return now;
}
