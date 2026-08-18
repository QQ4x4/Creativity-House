'use client';

import { Download, FileText, Paperclip } from 'lucide-react';
import { downloadLessonResource } from '@/lib/student/api';
import { formatFileSize } from '@/lib/student/types';

/** Downloadable attachments for the lesson currently playing. */
export default function LessonResources({ resources = [], labels }) {
  if (resources.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-center dark:border-white/10 dark:bg-white/[0.03]">
        <Paperclip className="mx-auto h-6 w-6 text-gray-500" aria-hidden />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{labels.noResources}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {resources.map((resource) => (
        <li
          key={resource.id}
          className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3.5 transition-all duration-300 hover:border-plum-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-purple-400/30 dark:hover:bg-white/[0.05]"
        >
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-plum-700 dark:bg-purple-500/15 dark:text-purple-200"
            aria-hidden
          >
            <FileText className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{resource.title}</p>
            <p className="mt-0.5 text-xs uppercase tabular-nums text-gray-500">
              {resource.type}
              {resource.sizeBytes ? ` · ${formatFileSize(resource.sizeBytes)}` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={() => downloadLessonResource(resource)}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3.5 text-xs font-semibold text-gray-900 transition-all duration-300 hover:border-plum-400 hover:bg-plum-50 hover:text-plum-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 dark:border-purple-400/30 dark:bg-purple-500/10 dark:text-purple-100 dark:hover:border-gold-400/50 dark:hover:bg-gold-400/10 dark:hover:text-gold-200"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">{labels.download}</span>
            <span className="sr-only sm:hidden">
              {labels.download}: {resource.title}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
