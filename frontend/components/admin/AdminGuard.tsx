'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';

import { useAuth } from '@/providers/AuthProvider';

interface AdminGuardProps {
  lang: string;
  children: ReactNode;
}

/**
 * Client-side gate for /[lang]/admin.
 *
 * This is a UX affordance only — every admin endpoint is independently
 * protected by the `admin` middleware in Laravel, so hiding the UI is never
 * the thing keeping a non-admin out.
 */
export function AdminGuard({ lang, children }: AdminGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const isAdmin = user?.is_admin === true;

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    router.replace(`/${lang}/login`);
  }, [isLoading, isAuthenticated, lang, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-plum-500 dark:text-gold-400" aria-hidden />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500" aria-hidden />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Administrator only</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your account does not have admin access to the course manager.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
