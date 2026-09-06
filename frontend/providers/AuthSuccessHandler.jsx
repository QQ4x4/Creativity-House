'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';

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
 * - ?auth=success → refresh session → strip query
 * - ?error=… → toast the failure → strip query
 */
export default function AuthSuccessHandler() {
  const { refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    const authSuccess = searchParams.get('auth') === 'success';
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

    (async () => {
      if (authSuccess) {
        const user = await refreshUser();
        if (cancelled) return;

        if (user) {
          toast.success(
            isAr ? 'تم تسجيل الدخول عبر Google بنجاح' : 'Signed in with Google successfully'
          );
        }
      } else if (isGoogleError) {
        toast.error(
          GOOGLE_ERROR_MESSAGES[locale][errorCode] ||
            (isAr ? 'فشل تسجيل الدخول عبر Google.' : 'Google sign-in failed.')
        );
      }

      const params = new URLSearchParams(searchParams.toString());
      params.delete('auth');
      params.delete('error');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, pathname, router, refreshUser]);

  return null;
}
