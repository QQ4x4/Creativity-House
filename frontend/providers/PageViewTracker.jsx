'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { buildUserData, createEventId, pushDataLayer } from '@/lib/tracking';

/**
 * Fires `page_view` on first mount and on every client-side route change.
 * Must render inside <Suspense> (useSearchParams) and <AuthProvider>.
 */
export default function PageViewTracker({ lang }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const lastUrlRef = useRef('');

  const query = searchParams?.toString() || '';
  const url = query ? `${pathname}?${query}` : pathname;

  useEffect(() => {
    // React StrictMode double-invokes effects in dev; only fire once per URL.
    if (!pathname || lastUrlRef.current === url) return;
    lastUrlRef.current = url;

    pushDataLayer(
      'page_view',
      createEventId(),
      {
        page_path: pathname,
        page_location: window.location.href,
        page_title: document.title,
        page_language: lang,
      },
      user
        ? buildUserData({
            email: user.email,
            phone: user.phone_number,
            firstName: user.first_name,
            lastName: user.last_name,
            name: user.name,
          })
        : {}
    );
    // Logged-in state resolving later must not re-fire the same page view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, pathname, lang]);

  return null;
}
