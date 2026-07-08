import Link from 'next/link';

/**
 * app/[lang]/not-found.jsx — Custom 404 Page
 *
 * Bilingual 404 page. Since this is a server component within the
 * [lang] route, we can't directly read the lang param here.
 * We provide both languages' text and let the layout's dir/lang
 * attributes handle the correct display direction.
 */
export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center px-4">
        <h1 className="text-8xl font-bold bg-gradient-to-r from-plum-700 to-plum-500 bg-clip-text text-transparent mb-4">
          404
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 mb-2">
          Page not found
        </p>
        <p className="text-xl text-slate-600 dark:text-slate-400 mb-8" dir="rtl">
          الصفحة غير موجودة
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/en"
            className="px-6 py-3 bg-gradient-to-r from-plum-700 to-plum-500 text-white rounded-full font-medium hover:shadow-lg hover:shadow-plum-500/30 transition-all"
          >
            English Home
          </Link>
          <Link
            href="/ar"
            className="px-6 py-3 bg-gradient-to-r from-plum-700 to-plum-500 text-white rounded-full font-medium hover:shadow-lg hover:shadow-plum-500/30 transition-all"
          >
            الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </main>
  );
}
