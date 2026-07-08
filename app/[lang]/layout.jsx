import { Inter, Cairo } from 'next/font/google';
import '../globals.css';

/**
 * app/[lang]/layout.jsx — Root Layout
 *
 * This is the primary layout for the entire application.
 * It receives the dynamic [lang] route parameter and:
 *
 *  1. Sets <html lang="..." dir="..."> SERVER-SIDE → no CLS flash
 *  2. Loads Google Fonts via next/font (automatic optimization, no FOUT)
 *  3. Applies font CSS variables to <html> for globals.css to consume
 *  4. Provides the base <body> with theme-aware classes
 *
 * The suppressHydrationWarning on <html> is required because the dark mode
 * toggle adds/removes the 'dark' class client-side, which would otherwise
 * cause a hydration mismatch warning.
 */

/* ─── Font Loading ───
 * next/font automatically:
 *  - Self-hosts the font files (no external requests to fonts.googleapis.com)
 *  - Adds font-display: swap
 *  - Generates optimal preload <link> tags
 *  - Sets CSS custom properties for use in globals.css
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

const cairo = Cairo({
  subsets: ['arabic'],
  variable: '--font-cairo',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

/* ─── Static Params for SSG ───
 * Pre-renders layouts for both /en and /ar at build time.
 */
/* ─── Metadata Base ───
 * Resolves relative OG/Twitter image URLs to absolute URLs at build time.
 * Without this Next.js falls back to localhost:3000, causing a build warning.
 */
export const metadata = {
  metadataBase: new URL('https://creativity-house.com'),
};

export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

/* ─── Layout Component ─── */
export default async function LangLayout({ children, params }) {
  const { lang } = await params;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <html
      lang={lang}
      dir={dir}
      className={`${inter.variable} ${cairo.variable}`}
      suppressHydrationWarning
    >
      <body>
        {children}
      </body>
    </html>
  );
}
