import { cookies } from 'next/headers';
import { Inter, Cairo } from 'next/font/google';
import ClientProviders from '@/providers/ClientProviders';
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

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var m=document.cookie.match(/(?:^|; )theme=([^;]*)/);var c=m?decodeURIComponent(m[1]):'';var dark=c==='dark'||t==='dark'||((!c&&!t)&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',!!dark);document.cookie='theme='+(dark?'dark':'light')+'; path=/; max-age=31536000; SameSite=Lax';}catch(e){}})();`;

/* ─── Layout Component ─── */
export default async function LangLayout({ children, params }) {
  const { lang } = await params;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const theme = (await cookies()).get('theme')?.value;
  const htmlClass = `${inter.variable} ${cairo.variable}${theme === 'dark' ? ' dark' : ''}`;

  return (
    <html
      lang={lang}
      dir={dir}
      className={htmlClass}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <ClientProviders lang={lang}>
          <div className="relative w-full max-w-full overflow-x-hidden min-h-screen flex flex-col">
            {children}
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}
