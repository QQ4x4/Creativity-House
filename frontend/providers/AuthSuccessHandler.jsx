'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { apiPost, getCsrfCookie } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { needsPhoneNumber } from '@/providers/CompleteProfileGate';

const GOOGLE_ERROR_MESSAGES = {
  en: {
    google_not_configured: 'Google sign-in is not configured on this server.',
    google_auth_failed: 'Google sign-in failed. Please try again.',
    invalid_google_email: 'Google did not return a valid email address.',
    account_deactivated: 'This account has been deactivated.',
  },
  ar: {
    google_not_configured: 'تسجيل الدخول عبر Google غير مُعد على هذا الخادم.',
    google_auth_failed: 'فشل تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.',
    invalid_google_email: 'لم يُرجع Google بريداً إلكترونياً صالحاً.',
    account_deactivated: 'تم تعطيل هذا الحساب.',
  },
};

/**
 * Handles Google OAuth return:
 * - ?auth=success&code=… → exchange handoff code for Sanctum SPA session
 * - Missing phone → /complete-profile
 * - ?error=… → toast the failure → strip query
 */
export default function AuthSuccessHandler() {
  const { refreshUser, setUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    const authSuccess = searchParams.get('auth') === 'success';
    const handoffCode = searchParams.get('code');
    const errorCode = searchParams.get('error');
    const isGoogleError = Boolean(errorCode && GOOGLE_ERROR_MESSAGES.en[errorCode]);

    if (!authSuccess && !isGoogleError) {
      handled.current = false;
      return undefined;
    }

    if (handled.current) return undefined;
    handled.current = true;

    let cancelled = false;
    const isAr = pathname?.startsWith('/ar');
    const locale = isAr ? 'ar' : 'en';
    const lang = isAr ? 'ar' : 'en';

    (async () => {
      if (authSuccess) {
        let user = null;

        try {
          if (handoffCode) {
            await getCsrfCookie();
            const data = await apiPost('/auth/google/exchange', { code: handoffCode });
            user = data?.user ?? null;
            if (user) setUser(user);
          }

          if (!user) {
            user = await refreshUser();
          }
        } catch {
          user = await refreshUser();
        }

        if (cancelled) return;

        if (user) {
          toast.success(
            isAr ? 'تم تسجيل الدخول عبر Google بنجاح' : 'Signed in with Google successfully'
          );

          // Strip OAuth query params, then land on the phone gate if needed.
          const nextPath = needsPhoneNumber(user)
            ? `/${lang}/complete-profile`
            : `/${lang}`;
          router.replace(nextPath);
          return;
        }

        toast.error(
          isAr
            ? 'تعذر إكمال تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.'
            : 'Could not complete Google sign-in. Please try again.'
        );
      } else if (isGoogleError) {
        toast.error(
          GOOGLE_ERROR_MESSAGES[locale][errorCode] ||
            (isAr ? 'فشل تسجيل الدخول عبر Google.' : 'Google sign-in failed.')
        );
      }

      const params = new URLSearchParams(searchParams.toString());
      params.delete('auth');
      params.delete('code');
      params.delete('error');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, pathname, router, refreshUser, setUser]);

  return null;
}
