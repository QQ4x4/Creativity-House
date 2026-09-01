import type { ReactNode } from 'react';

import { AdminGuard } from '@/components/admin/AdminGuard';

/**
 * Admin shell. No dictionary/i18n loading here — missing admin translation
 * files must never 500 this layout. Auth gating is client-side (`AdminGuard`).
 */

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ lang: string }>;
};

export const metadata = {
  title: 'Admin — Creativity House',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children, params }: LayoutProps) {
  const { lang } = await params;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#120a1c]">
      {/* Authored LTR regardless of site locale — admin forms stay consistent. */}
      <div dir="ltr" className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <AdminGuard lang={lang}>{children}</AdminGuard>
      </div>
    </div>
  );
}
