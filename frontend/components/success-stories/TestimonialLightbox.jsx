'use client';

import { useCallback, useEffect, useId, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { createPortal } from 'react-dom';

/**
 * Facade → iframe only when open. Focus trap + ESC + arrows + swipe.
 */
export default function TestimonialLightbox({
  items = [],
  index,
  onClose,
  onChangeIndex,
  labels = {},
  lang = 'en',
}) {
  const open = index != null && index >= 0 && items[index];
  const item = open ? items[index] : null;
  const dialogRef = useRef(null);
  const touchStartX = useRef(null);
  const titleId = useId();

  const go = useCallback(
    (delta) => {
      if (!items.length || index == null) return;
      const next = (index + delta + items.length) % items.length;
      onChangeIndex(next);
    },
    [index, items.length, onChangeIndex]
  );

  useEffect(() => {
    if (!open) return undefined;

    const previous = document.activeElement;
    const node = dialogRef.current;
    const focusables = () =>
      node
        ? Array.from(
            node.querySelectorAll(
              'button, [href], iframe, [tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => !el.hasAttribute('disabled'))
        : [];

    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        go(lang === 'ar' ? 1 : -1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        go(lang === 'ar' ? -1 : 1);
      }
      if (event.key === 'Tab' && node) {
        const list = focusables();
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    // Focus close button shortly after mount.
    requestAnimationFrame(() => {
      const closeBtn = node?.querySelector('[data-lightbox-close]');
      closeBtn?.focus();
    });

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [open, go, lang, onClose]);

  if (!open || !item || typeof document === 'undefined') return null;

  const embed =
    item.embed_url_autoplay ||
    (item.embed_url
      ? item.embed_url.replace(/autoplay=(false|true)/, 'autoplay=true')
      : null);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#120a1c] shadow-2xl"
        onTouchStart={(e) => {
          touchStartX.current = e.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          const end = e.changedTouches[0]?.clientX;
          touchStartX.current = null;
          if (start == null || end == null) return;
          const delta = end - start;
          if (Math.abs(delta) < 50) return;
          // Swipe end→start (left in LTR) = next
          if (delta < 0) go(lang === 'ar' ? -1 : 1);
          else go(lang === 'ar' ? 1 : -1);
        }}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-base font-bold text-white">
              {item.person_name}
            </h2>
            {item.person_role ? (
              <p className="truncate text-sm text-white/60">{item.person_role}</p>
            ) : null}
          </div>
          <button
            type="button"
            data-lightbox-close
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
            aria-label={labels.close || 'Close'}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="relative aspect-video w-full bg-black">
          {embed ? (
            <iframe
              key={item.id}
              title={item.video_title || item.person_name || 'Success story'}
              src={embed}
              className="h-full w-full border-0"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : null}

          {items.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(lang === 'ar' ? 1 : -1)}
                className="absolute start-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                aria-label={labels.previous || 'Previous'}
              >
                <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => go(lang === 'ar' ? -1 : 1)}
                className="absolute end-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                aria-label={labels.next || 'Next'}
              >
                <ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden />
              </button>
            </>
          ) : null}
        </div>

        {(item.quote || item.caption) && (
          <div className="space-y-1 px-4 py-4 sm:px-5">
            {item.quote ? (
              <p className="text-sm italic text-gold-200/90">“{item.quote}”</p>
            ) : null}
            {item.caption ? (
              <p className="text-sm text-white/70">{item.caption}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
