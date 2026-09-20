'use client';

import { useEffect } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

/**
 * App theme hook — wraps next-themes and keeps the SSR `theme` cookie in sync
 * with Tailwind's `class="dark"` strategy (see app/[lang]/layout.jsx).
 */
export function useTheme() {
  const { resolvedTheme, setTheme, theme } = useNextTheme();
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    if (!resolvedTheme) return;
    document.cookie = `theme=${resolvedTheme}; path=/; max-age=31536000; SameSite=Lax`;
  }, [resolvedTheme]);

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return {
    isDark,
    toggleTheme,
    resolvedTheme,
    theme,
    setTheme,
  };
}
