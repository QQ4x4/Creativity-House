'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  GraduationCap,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { ADMIN_UNREAD_REFRESH_EVENT } from '@/components/admin/AdminClientShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  fetchAdminInquiries,
  fetchAdminInquiry,
  fetchAdminInquiryUnreadCounts,
  replyAdminInquiry,
} from '@/lib/admin/api';
import type { InquiryDto, InquiryStatus, InquiryType } from '@/lib/admin/types';
import { toastApiError } from '@/lib/toast';

type TypeFilter = InquiryType;

function UnreadCountBadge({ count }: { count: number }) {
  if (count < 1) return null;
  return (
    <span className="ms-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-plum-700 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white dark:bg-plum-500">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function statusBadge(status: InquiryStatus) {
  if (status === 'unread') return <Badge className="bg-plum-600 text-white hover:bg-plum-600">Unread</Badge>;
  if (status === 'replied') return <Badge variant="secondary">Replied</Badge>;
  return (
    <Badge variant="secondary" className="border-gray-300 bg-transparent dark:border-white/20">
      Read
    </Badge>
  );
}

function formatWhen(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function MessagesInboxScreen() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('user');
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'all'>('all');
  const [rows, setRows] = useState<InquiryDto[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<InquiryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [unreadByType, setUnreadByType] = useState({ user: 0, organization: 0, total: 0 });

  const refreshUnreadCounts = useCallback(async () => {
    try {
      const counts = await fetchAdminInquiryUnreadCounts();
      setUnreadByType(counts);
      window.dispatchEvent(new Event(ADMIN_UNREAD_REFRESH_EVENT));
    } catch {
      // Non-blocking for the inbox UI.
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setSelected(null);
    setReplyBody('');
    setReplySubject('');
  }, []);

  const loadList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAdminInquiries({
        type: typeFilter,
        status: statusFilter,
      });
      setRows(data);
      // Do not auto-open the first message — only keep a selection if it still exists.
      setSelectedId((current) => {
        if (current && data.some((row) => row.id === current)) return current;
        return null;
      });
      setSelected((current) => {
        if (current && data.some((row) => row.id === current.id)) return current;
        return null;
      });
      await refreshUnreadCounts();
    } catch (caught) {
      setError((caught as { message?: string })?.message ?? 'Could not load inquiries.');
      setRows([]);
      clearSelection();
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, statusFilter, refreshUnreadCounts, clearSelection]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const selectType = (next: TypeFilter) => {
    if (next === typeFilter) return;
    clearSelection();
    setTypeFilter(next);
  };

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsDetailLoading(true);
      try {
        const detail = await fetchAdminInquiry(selectedId);
        if (cancelled) return;
        setSelected(detail);
        setRows((prev) =>
          prev.map((row) => (row.id === detail.id ? { ...row, status: detail.status } : row))
        );
        setReplySubject((prev) => prev || 'Re: Your inquiry to Creativity House');
        await refreshUnreadCounts();
      } catch (caught) {
        if (!cancelled) toastApiError(caught, 'Could not open inquiry.');
      } finally {
        if (!cancelled) setIsDetailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId, refreshUnreadCounts]);

  const listUnreadCount = useMemo(
    () => rows.filter((row) => row.status === 'unread').length,
    [rows]
  );

  const onSendReply = async () => {
    if (!selected) return;
    const message = replyBody.trim();
    if (message.length < 10) {
      toast.error('Reply must be at least 10 characters.');
      return;
    }

    setIsSending(true);
    try {
      const updated = await replyAdminInquiry(selected.id, {
        message,
        subject: replySubject.trim() || undefined,
      });
      setSelected(updated);
      setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setReplyBody('');
      toast.success('Reply sent via email.');
      await refreshUnreadCounts();
    } catch (caught) {
      toastApiError(caught, 'Failed to send reply.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Student inquiries and organization consultation requests.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadList()}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={typeFilter === 'user' ? 'default' : 'outline'}
          onClick={() => selectType('user')}
        >
          <GraduationCap className="h-4 w-4" aria-hidden />
          Student Inquiries
          <UnreadCountBadge count={unreadByType.user} />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={typeFilter === 'organization' ? 'default' : 'outline'}
          onClick={() => selectType('organization')}
        >
          <Building2 className="h-4 w-4" aria-hidden />
          Organization Consultations
          <UnreadCountBadge count={unreadByType.organization} />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'unread', 'read', 'replied'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => {
              clearSelection();
              setStatusFilter(status);
            }}
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors ${
              statusFilter === status
                ? 'bg-plum-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300'
            }`}
          >
            {status}
            {status === 'unread' && listUnreadCount > 0 ? ` (${listUnreadCount})` : ''}
          </button>
        ))}
      </div>

      <div className="grid min-h-[32rem] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#181124] lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="border-b border-gray-200 dark:border-white/10 lg:border-b-0 lg:border-e">
          <div className="max-h-[28rem] overflow-y-auto lg:max-h-[calc(100vh-14rem)]">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading…
              </div>
            ) : error ? (
              <p className="p-6 text-sm text-red-500">{error}</p>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-gray-500">
                <MessageSquare className="h-8 w-8 opacity-40" aria-hidden />
                No messages in this filter.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-white/5">
                {rows.map((row) => {
                  const active = row.id === selectedId;
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(row.id)}
                        className={`w-full px-4 py-3 text-start transition-colors ${
                          active
                            ? 'bg-plum-50 dark:bg-plum-900/30'
                            : 'hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`truncate text-sm ${
                              row.status === 'unread'
                                ? 'font-bold text-gray-900 dark:text-white'
                                : 'font-medium text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {row.full_name}
                          </p>
                          {statusBadge(row.status)}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-gray-500">{row.email}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
                          {row.message}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-400">{formatWhen(row.created_at)}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className="flex min-h-[28rem] flex-col p-5 sm:p-6">
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-gray-500">
              <Mail className="h-8 w-8 opacity-40" aria-hidden />
              Select a message to view details and reply.
            </div>
          ) : isDetailLoading && !selected ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Opening…
            </div>
          ) : selected ? (
            <>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4 dark:border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selected.full_name}</h2>
                  <p className="text-sm text-gray-500">{selected.email}</p>
                </div>
                {statusBadge(selected.status)}
              </div>

              <dl className="mb-5 grid gap-3 text-sm sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-4 w-4 text-plum-600 dark:text-gold-400" aria-hidden />
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-400">Name</dt>
                    <dd className="text-gray-800 dark:text-gray-200">{selected.full_name}</dd>
                  </div>
                </div>
                {selected.company_name ? (
                  <div className="flex items-start gap-2">
                    <Building2 className="mt-0.5 h-4 w-4 text-plum-600 dark:text-gold-400" aria-hidden />
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-400">Company</dt>
                      <dd className="text-gray-800 dark:text-gray-200">{selected.company_name}</dd>
                    </div>
                  </div>
                ) : null}
                {selected.phone_number ? (
                  <div className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-4 w-4 text-plum-600 dark:text-gold-400" aria-hidden />
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-400">Phone</dt>
                      <dd dir="ltr" className="inline-block text-gray-800 dark:text-gray-200">
                        {selected.phone_number}
                      </dd>
                    </div>
                  </div>
                ) : null}
                {selected.target_course ? (
                  <div className="flex items-start gap-2">
                    <GraduationCap className="mt-0.5 h-4 w-4 text-plum-600 dark:text-gold-400" aria-hidden />
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-400">Target course</dt>
                      <dd className="text-gray-800 dark:text-gray-200">{selected.target_course}</dd>
                    </div>
                  </div>
                ) : null}
              </dl>

              <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/10 dark:bg-black/20">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Message</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                  {selected.message}
                </p>
                <p className="mt-3 text-xs text-gray-400">Received {formatWhen(selected.created_at)}</p>
              </div>

              <div className="mt-auto space-y-3 border-t border-gray-100 pt-5 dark:border-white/10">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Reply via Email</h3>
                <Input
                  value={replySubject}
                  onChange={(event) => setReplySubject(event.target.value)}
                  placeholder="Subject"
                  aria-label="Reply subject"
                />
                <Textarea
                  value={replyBody}
                  onChange={(event) => setReplyBody(event.target.value)}
                  placeholder="Write your reply…"
                  rows={6}
                  aria-label="Reply message"
                />
                <div className="flex justify-end">
                  <Button type="button" onClick={() => void onSendReply()} disabled={isSending}>
                    {isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" aria-hidden />
                        Send reply
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
