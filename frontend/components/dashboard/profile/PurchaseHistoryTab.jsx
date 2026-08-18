'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Download, Loader2, Receipt } from 'lucide-react';
import GlassPanel from '@/components/dashboard/GlassPanel';
import { downloadInvoice } from '@/lib/student/api';
import { formatCurrency, formatDate } from '@/lib/student/types';
import { toastApiError } from '@/lib/toast';

const STATUS_STYLES = {
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200',
  refunded: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200',
  pending: 'border-purple-200 bg-purple-50 text-plum-800 dark:border-purple-400/30 dark:bg-purple-500/15 dark:text-purple-200',
  failed: 'border-red-200 bg-red-50 text-red-800 dark:border-red-400/30 dark:bg-red-500/15 dark:text-red-200',
};

function StatusPill({ status, labels }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        STATUS_STYLES[status] || STATUS_STYLES.pending
      }`}
    >
      {labels[`status_${status}`] || status}
    </span>
  );
}

function InvoiceButton({ order, label, isBusy, onDownload, full = false }) {
  return (
    <button
      type="button"
      onClick={() => onDownload(order)}
      disabled={isBusy}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3.5 text-xs font-semibold text-gray-900 transition-all duration-300 hover:border-plum-400 hover:bg-plum-50 hover:text-plum-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-purple-400/30 dark:bg-purple-500/10 dark:text-purple-100 dark:hover:border-gold-400/50 dark:hover:bg-gold-400/10 dark:hover:text-gold-200 ${
        full ? 'w-full' : ''
      }`}
    >
      {isBusy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Download className="h-3.5 w-3.5" aria-hidden />
      )}
      {label}
    </button>
  );
}

/** Tab 3 — purchase history table + invoice downloads. */
export default function PurchaseHistoryTab({ orders, isLoading, labels, lang }) {
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownload = async (order) => {
    setDownloadingId(order.orderId);

    try {
      const result = await downloadInvoice(order, {
        lang,
        dir: lang === 'ar' ? 'rtl' : 'ltr',
        brand: labels.brand,
        invoice: labels.invoice,
        date: labels.date,
        course: labels.course,
        status: labels.status,
        total: labels.total,
      });

      toast.success(result === 'preview' ? labels.invoicePreviewOpened : labels.invoiceDownloaded);
    } catch (error) {
      toastApiError(error, labels.genericError);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <GlassPanel>
      <div className="flex items-start gap-3">
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 shadow-[0_0_18px_rgba(52,211,153,0.22)]"
          aria-hidden
        >
          <Receipt className="h-5 w-5 text-emerald-300" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{labels.purchasesTab}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{labels.purchasesTabHint}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3" aria-hidden>
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
          {labels.noPurchases}
        </p>
      ) : (
        <>
          {/* Desktop / tablet table */}
          <div className="mt-6 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] border-collapse text-start">
              <caption className="sr-only">{labels.purchasesTab}</caption>
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  {[labels.orderId, labels.date, labels.course, labels.total, labels.status, labels.actions].map(
                    (heading, index) => (
                      <th
                        key={heading}
                        scope="col"
                        className={`pb-3 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 ${
                          index === 5 ? 'text-end' : 'text-start'
                        }`}
                      >
                        {index === 5 ? <span className="sr-only">{heading}</span> : heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.orderId}
                    className="border-b border-gray-100 transition-colors duration-300 last:border-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/[0.04]"
                  >
                    <td className="py-4 text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100" dir="ltr">
                      {order.orderId}
                    </td>
                    <td className="py-4 text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(order.purchasedAt, lang)}
                    </td>
                    <td className="py-4 pe-4 text-sm text-gray-900 dark:text-gray-100">{order.courseTitle}</td>
                    <td className="py-4 text-sm font-semibold tabular-nums text-gold-300" dir="ltr">
                      {formatCurrency(order.amount, order.currency)}
                    </td>
                    <td className="py-4">
                      <StatusPill status={order.status} labels={labels} />
                    </td>
                    <td className="py-4 text-end">
                      <InvoiceButton
                        order={order}
                        label={labels.downloadInvoice}
                        isBusy={downloadingId === order.orderId}
                        onDownload={handleDownload}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards — no horizontal scrolling */}
          <ul className="mt-6 space-y-3 md:hidden">
            {orders.map((order) => (
              <li
                key={order.orderId}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-4 transition-all duration-300 hover:border-plum-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-purple-400/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{order.courseTitle}</p>
                    <p className="mt-1 text-xs tabular-nums text-gray-600 dark:text-gray-400" dir="ltr">
                      {order.orderId} · {formatDate(order.purchasedAt, lang)}
                    </p>
                  </div>
                  <StatusPill status={order.status} labels={labels} />
                </div>

                <p
                  className="mt-3 text-sm font-semibold tabular-nums text-gold-300"
                  dir="ltr"
                >
                  {formatCurrency(order.amount, order.currency)}
                </p>

                <div className="mt-3">
                  <InvoiceButton
                    order={order}
                    label={labels.downloadInvoice}
                    isBusy={downloadingId === order.orderId}
                    onDownload={handleDownload}
                    full
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </GlassPanel>
  );
}
