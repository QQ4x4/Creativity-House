'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, MessageSquare } from 'lucide-react';

import { AdminGuard } from '@/components/admin/AdminGuard';
import { fetchAdminInquiryUnreadCounts } from '@/lib/admin/api';

export const ADMIN_UNREAD_REFRESH_EVENT = 'ch:admin-unread-refresh';

function UnreadPill({ count, active = false }: { count: number; active?: boolean }) {
  if (count < 1) return null;
  return (
    <span
      className={`ms-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
        active
          ? 'bg-white/25 text-white'
          : 'bg-plum-700 text-white dark:bg-plum-500'
      }`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function AdminNav({ lang }: { lang: string }) {
  const pathname = usePathname();
  const [unreadTotal, setUnreadTotal] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const counts = await fetchAdminInquiryUnreadCounts();
      setUnreadTotal(counts.total);
    } catch {
      // Nav badge is non-critical — keep last known count.
    }
  }, []);

  useEffect(() => {
    void refreshUnread();
    const onRefresh = () => {
      void refreshUnread();
    };
    window.addEventListener(ADMIN_UNREAD_REFRESH_EVENT, onRefresh);
    const timer = window.setInterval(() => {
      void refreshUnread();
    }, 60_000);
    return () => {
      window.removeEventListener(ADMIN_UNREAD_REFRESH_EVENT, onRefresh);
      window.clearInterval(timer);
    };
  }, [refreshUnread, pathname]);

  const links = [
    {
      href: `/${lang}/admin/courses`,
      label: 'Courses',
      icon: BookOpen,
      match: `/${lang}/admin/courses`,
      badge: 0,
    },
    {
      href: `/${lang}/admin/messages`,
      label: 'Messages',
      icon: MessageSquare,
      match: `/${lang}/admin/messages`,
      badge: unreadTotal,
    },
  ];

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-4 dark:border-white/10">
      {links.map(({ href, label, icon: Icon, match, badge }) => {
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
            <UnreadPill count={badge} active={Boolean(active)} />
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
