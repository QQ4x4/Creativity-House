'use client';

import { useState, useEffect } from 'react';

function persistTheme(isDark) {
    const value = isDark ? 'dark' : 'light';
    const root = document.documentElement;
    if (isDark) {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
    localStorage.setItem('theme', value);
    document.cookie = `theme=${value}; path=/; max-age=31536000; SameSite=Lax`;
}

export function useTheme() {
    const [isDark, setIsDark] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('theme');
            if (saved) return saved === 'dark';
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    useEffect(() => {
        persistTheme(isDark);
    }, [isDark]);

    const toggleTheme = () => setIsDark((prev) => !prev);

    return { isDark, toggleTheme };
}
