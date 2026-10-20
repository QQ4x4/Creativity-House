'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { captureGoogleClickIds } from '@/lib/tracking';

/**
 * Persists Google Ads click IDs (gclid / gbraid / wbraid) from the URL
 * into localStorage + cookies on first load and every client route change.
 */
export default function GoogleClickIdCapture() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams?.toString() || '';

  useEffect(() => {
    captureGoogleClickIds();
  }, [pathname, query]);

  return null;
}
