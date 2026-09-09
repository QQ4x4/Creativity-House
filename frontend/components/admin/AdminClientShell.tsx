'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, MessageSquare } from 'lucide-react';

import { AdminGuard } from '@/components/admin/AdminGuard';

function AdminNav({ lang }: { lang: string }) {
  const pathname = usePathname();
  const links = [
    {
      href: `/${lang}/admin/courses`,
      label: 'Courses',
      icon: BookOpen,
      match: `/${lang}/admin/courses`,
    },
    {
      href: `/${lang}/admin/messages`,
      label: 'Messages',
      icon: MessageSquare,
      match: `/${lang}/admin/messages`,
    },
  ];

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-4 dark:border-white/10">
      {links.map(({ href, label, icon: Icon, match }) => {
        const active = pathname?.startsWith(match);
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? 'bg-plum-700 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

type ClientShellProps = {
  lang: string;
  children: ReactNode;
};

export function AdminClientShell({ lang, children }: ClientShellProps) {
  return (
    <AdminGuard lang={lang}>
      <AdminNav lang={lang} />
      {children}
    </AdminGuard>
  );
}
