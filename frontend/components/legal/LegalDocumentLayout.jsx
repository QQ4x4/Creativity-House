'use client';

import PublicShell from '@/components/catalog/PublicShell';

export default function LegalDocumentLayout({ dictionary, lang, children }) {
  const isRTL = lang === 'ar';

  return (
    <PublicShell dictionary={dictionary} lang={lang}>
      <div className="px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <article
          lang={lang}
          dir={isRTL ? 'rtl' : 'ltr'}
          className="prose prose-slate mx-auto max-w-4xl dark:prose-invert prose-headings:tracking-tight prose-a:text-plum-700 prose-strong:text-slate-900 dark:prose-a:text-gold-300 dark:prose-strong:text-white"
        >
          {children}
        </article>
      </div>
    </PublicShell>
  );
}
