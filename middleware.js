import { NextResponse } from 'next/server';

/**
 * Next.js Middleware — i18n Routing
 *
 * Handles automatic locale detection and redirection:
 *  1. If the URL already has /en or /ar prefix → pass through
 *  2. Otherwise, detect locale from:
 *     a. NEXT_LOCALE cookie (user preference from previous visit)
 *     b. Accept-Language header (browser preference)
 *     c. Default to 'ar' (matching original fallbackLng)
 *  3. Redirect to the locale-prefixed URL
 *
 * Static assets, API routes, and Next.js internals are excluded via the matcher.
 */

const locales = ['en', 'ar'];
const defaultLocale = 'ar';

function getPreferredLocale(request) {
  // 1. Check cookie first (user's explicit choice)
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }

  // 2. Parse Accept-Language header
  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(',')
      .map((entry) => {
        const [lang] = entry.trim().split(';');
        return lang.split('-')[0].toLowerCase();
      });

    const match = preferred.find((lang) => locales.includes(lang));
    if (match) return match;
  }

  // 3. Default
  return defaultLocale;
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Check if the pathname already starts with a supported locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    // Set x-lang header for downstream components to read if needed
    const lang = pathname.split('/')[1];
    const response = NextResponse.next();
    response.headers.set('x-lang', lang);
    response.headers.set('x-dir', lang === 'ar' ? 'rtl' : 'ltr');
    return response;
  }

  // Determine the best locale and redirect
  const locale = getPreferredLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;

  const response = NextResponse.redirect(request.nextUrl);
  return response;
}

export const config = {
  /*
   * Match all request paths EXCEPT:
   * - api routes
   * - _next internals (static files, image optimization)
   * - public assets (favicon, icons, logo, etc.)
   */
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.svg|icons\\.svg|logo\\.png|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)',
  ],
};
