'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Paths that remain reachable while phone_number is still missing.
 * Everything else redirects to /[lang]/complete-profile.
 */
const PHONE_GATE_EXEMPT = new Set([
  'complete-profile',
  'login',
  'register',
  'verify-otp',
  'forgot-password',
  'reset-password',
]);

export function needsPhoneNumber(user) {
  if (!user) return false;
  return !String(user.phone_number ?? '').trim();
}

function pathSegmentAfterLang(pathname) {
  if (!pathname) return '';
  const parts = pathname.split('/').filter(Boolean);
  // /en/complete-profile → complete-profile; /en → ''
  return parts[1] || '';
}

/**
 * Blocks the rest of the app until authenticated Google users add a phone number.
 */
export default function CompleteProfileGate({ children, lang = 'en' }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const segment = pathSegmentAfterLang(pathname);
  const isExempt = PHONE_GATE_EXEMPT.has(segment);
  const isCompleteProfilePage = segment === 'complete-profile';
  const missingPhone = isAuthenticated && needsPhoneNumber(user);

  useEffect(() => {
    if (isLoading) return;

    if (isCompleteProfilePage && !isAuthenticated) {
      router.replace(`/${lang}/login`);
      return;
    }

    if (isCompleteProfilePage && isAuthenticated && !needsPhoneNumber(user)) {
      router.replace(`/${lang}`);
      return;
    }

    if (missingPhone && !isExempt) {
      router.replace(`/${lang}/complete-profile`);
    }
  }, [
    isLoading,
    isAuthenticated,
    missingPhone,
    isExempt,
    isCompleteProfilePage,
    user,
    lang,
    router,
  ]);

  // Hold only when we know a gated user is mid-redirect — never blank the
  // public marketing site during the initial /auth/me probe.
  if (missingPhone && !isExempt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-plum-950 to-slate-900">
        <Loader2 className="h-7 w-7 animate-spin text-gold-300" aria-hidden />
        <span className="sr-only">Redirecting…</span>
      </div>
    );
  }

  if (isCompleteProfilePage && (isLoading || !isAuthenticated)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-plum-950 to-slate-900">
        <Loader2 className="h-7 w-7 animate-spin text-gold-300" aria-hidden />
      </div>
    );
  }

  return children;
}
