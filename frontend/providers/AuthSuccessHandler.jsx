'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Handles Google OAuth return: ?auth=success → refresh session → strip query.
 * Isolated so useSearchParams can sit behind Suspense without unmounting AuthProvider.
 */
export default function AuthSuccessHandler() {
  const { refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (searchParams.get('auth') !== 'success') {
      handled.current = false;
      return undefined;
    }

    if (handled.current) return undefined;
    handled.current = true;

    let cancelled = false;

    (async () => {
      const user = await refreshUser();
      if (cancelled) return;

      if (user) {
        toast.success(
          pathname?.startsWith('/ar')
            ? 'تم تسجيل الدخول عبر Google بنجاح'
            : 'Signed in with Google successfully'
        );
      }

      const params = new URLSearchParams(searchParams.toString());
      params.delete('auth');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, pathname, router, refreshUser]);

  return null;
}
