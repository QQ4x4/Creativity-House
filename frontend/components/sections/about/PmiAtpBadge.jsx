import Image from 'next/image';

/** PMI ATP badge — never recolor, crop, rotate, stretch, filter, or overlay. */
export const PMI_ATP_BADGE_SRC = '/images/pmi-atp-badge-2026.png';
export const PMI_ATP_BADGE_INTRINSIC = { width: 900, height: 900 };

/**
 * @param {{
 *   alt: string,
 *   size?: number,
 *   priority?: boolean,
 *   className?: string,
 *   caption?: string,
 * }} props
 */
export default function PmiAtpBadge({
  alt,
  size = 120,
  priority = false,
  className = '',
  caption,
}) {
  // Callers: hero/ATP section ≥96px; trainer credential row may use 56–64px.
  const display = size;
  // Clear space ≥ 12% of badge width on each side.
  const clear = Math.ceil(display * 0.12);

  return (
    <figure
      className={`inline-flex flex-col items-center ${className}`}
      style={{ padding: clear }}
    >
      <Image
        src={PMI_ATP_BADGE_SRC}
        alt={alt}
        width={PMI_ATP_BADGE_INTRINSIC.width}
        height={PMI_ATP_BADGE_INTRINSIC.height}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        sizes={`${display}px`}
        className="h-auto w-auto object-contain"
        style={{ width: display, height: display, maxWidth: display }}
      />
      {caption ? (
        <figcaption className="mt-3 max-w-[14rem] text-center text-xs font-medium leading-snug tracking-wide text-slate-400 dark:text-slate-400">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
