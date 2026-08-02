'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiGet, apiPost, getCsrfCookie } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children, lang = 'en' }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiGet('/auth/me');
      const nextUser = data?.user ?? null;
      setUser(nextUser);
      return nextUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        await refreshUser();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      await getCsrfCookie();
      await apiPost('/auth/logout');
      toast.success(lang === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully');
    } catch {
      toast.success(lang === 'ar' ? 'تم تسجيل الخروج' : 'Logged out');
    }
    setUser(null);
    router.push(`/${lang}`);
  }, [lang, router]);

  const value = useMemo(
    () => ({
      user,
      setUser,
      isLoading,
      isAuthenticated: Boolean(user),
      refreshUser,
      logout,
    }),
    [user, isLoading, refreshUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
