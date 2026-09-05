'use client';

import { Download, ExternalLink, FileAudio, FileText, Link2, Paperclip } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';
import { formatFileSize } from '@/lib/student/types';

const ACTION_CLASS =
  'inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3.5 text-xs font-semibold text-gray-900 transition-all duration-300 hover:border-plum-400 hover:bg-plum-50 hover:text-plum-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 dark:border-purple-400/30 dark:bg-purple-500/10 dark:text-purple-100 dark:hover:border-gold-400/50 dark:hover:bg-gold-400/10 dark:hover:text-gold-200';

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
      {resources.map((resource) => {
        const kind = resolveKind(resource);
        const Icon = kind.icon;
        const isLink = isLinkResource(resource);
        const actionLabel = isLink ? labels.open || 'Open' : labels.download || 'Download';
        const href = isLink
          ? resource.url
          : `${getApiBaseUrl().replace(/\/+$/, '')}/v1/resources/${resource.id}/download`;

        return (
          <li
            key={resource.id}
            className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3.5 transition-all duration-300 hover:border-plum-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-purple-400/30 dark:hover:bg-white/[0.05]"
          >
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-plum-700 dark:bg-purple-500/15 dark:text-purple-200"
              aria-hidden
            >
              <Icon className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                {resource.title}
              </p>
              <p className="mt-0.5 text-xs uppercase tabular-nums text-gray-500">
                {kind.label}
                {resource.sizeBytes || resource.file_size
                  ? ` · ${
                      resource.file_size ||
                      (resource.sizeBytes ? formatFileSize(resource.sizeBytes) : '')
                    }`
                  : ''}
              </p>
            </div>

            {isLink ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={ACTION_CLASS}
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">{actionLabel}</span>
                <span className="sr-only sm:hidden">
                  {actionLabel}: {resource.title}
                </span>
              </a>
            ) : (
              <a href={href} className={ACTION_CLASS}>
                <Download className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">{actionLabel}</span>
                <span className="sr-only sm:hidden">
                  {actionLabel}: {resource.title}
                </span>
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function isLinkResource(resource) {
  return (
    resource?.type === 'link' ||
    resource?.source_type === 'link' ||
    String(resource?.type || '').toLowerCase() === 'link'
  );
}

function resolveKind(resource) {
  const type = String(resource.type || resource.source_type || '').toLowerCase();
  const url = String(resource.url || '');

  if (isLinkResource(resource)) {
    return { icon: Link2, label: 'link' };
  }

  if (['ogg', 'oga', 'mp3', 'wav', 'm4a', 'aac', 'flac', 'audio'].includes(type)) {
    return { icon: FileAudio, label: type || 'audio' };
  }

  const ext = (url.split('?')[0]?.split('.').pop() || type || 'file').toLowerCase();
  if (['ogg', 'oga', 'mp3', 'wav', 'm4a', 'aac', 'flac'].includes(ext)) {
    return { icon: FileAudio, label: ext };
  }

  if (
    ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'zip', 'rar', 'png', 'jpg', 'jpeg', 'webp'].includes(
      ext
    )
  ) {
    return { icon: FileText, label: ext };
  }

  return { icon: FileText, label: ext === 'file' ? 'file' : ext || 'file' };
}
