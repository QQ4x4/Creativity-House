'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, MessageCircle, Play } from 'lucide-react';

import PublicShell from '@/components/catalog/PublicShell';
import { fetchSuccessStories } from '@/lib/catalog/successStories';
import { createEventId, pushDataLayer } from '@/lib/tracking';
import { cn } from '@/lib/utils';

import TestimonialLightbox from './TestimonialLightbox';

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function localizePage(page, lang) {
  if (!page) return {};
  const ar = lang === 'ar';
  return {
    heroTitle: ar ? page.hero_title_ar || page.hero_title_en : page.hero_title_en || page.hero_title_ar,
    heroSubtitle: ar
      ? page.hero_subtitle_ar || page.hero_subtitle_en
      : page.hero_subtitle_en || page.hero_subtitle_ar,
    ctaTitle: ar ? page.cta_title_ar || page.cta_title_en : page.cta_title_en || page.cta_title_ar,
    ctaButton: ar
      ? page.cta_button_ar || page.cta_button_en
      : page.cta_button_en || page.cta_button_ar,
    ctaLink: page.cta_link || '/courses',
  };
}

function PlayButton({ className, size = 'md' }) {
  const dim = size === 'lg' ? 'h-16 w-16 sm:h-20 sm:w-20' : 'h-12 w-12';
  const icon = size === 'lg' ? 'h-7 w-7 sm:h-8 sm:w-8' : 'h-5 w-5';
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#603153] to-[#BE9853] text-white shadow-[0_12px_40px_rgba(96,49,83,0.45)] transition-transform duration-300 group-hover:scale-110',
        dim,
        className
      )}
    >
      <Play className={cn(icon, 'ms-0.5 fill-current')} aria-hidden />
    </span>
  );
}

function TestimonialCard({ item, labels, onPlay, priority = false }) {
  const isPortrait = item.orientation === 'portrait';
  const thumb = item.thumbnail_url;

  return (
    <button
      type="button"
      onClick={() => onPlay(item)}
      className="group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-white text-start shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-plum-300/60 hover:shadow-[0_20px_50px_rgba(96,49,83,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 dark:border-white/10 dark:bg-[#181124]/90 dark:hover:border-gold-400/30"
      aria-label={`${labels.playStory || 'Play story'}: ${item.person_name || ''}`}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-gray-100 dark:bg-white/5">
        {thumb && isPortrait ? (
          <>
            <Image
              src={thumb}
              alt=""
              fill
              sizes="(max-width:768px) 100vw, 33vw"
              className="scale-110 object-cover blur-xl opacity-60"
              priority={priority}
            />
            <Image
              src={thumb}
              alt=""
              fill
              sizes="(max-width:768px) 100vw, 33vw"
              className="object-contain"
              priority={priority}
            />
          </>
        ) : thumb ? (
          <Image
            src={thumb}
            alt=""
            fill
            sizes="(max-width:768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            priority={priority}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-plum-800/40 to-gold-600/30" />
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <PlayButton />
        </span>
        {item.duration_seconds > 0 ? (
          <span className="absolute bottom-2 end-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
            {formatDuration(item.duration_seconds)}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-sm font-bold text-gray-900 dark:text-white">{item.person_name}</p>
        {item.person_role ? (
          <p className="text-xs text-gray-600 dark:text-gray-400">{item.person_role}</p>
        ) : null}
        {item.caption ? (
          <p className="line-clamp-2 text-sm text-gray-700 dark:text-gray-300">{item.caption}</p>
        ) : null}
        {item.course?.title ? (
          <span className="mt-auto inline-flex w-fit rounded-full border border-plum-200 bg-plum-50 px-2.5 py-0.5 text-[11px] font-semibold text-plum-800 dark:border-plum-400/30 dark:bg-plum-500/15 dark:text-plum-100">
            {item.course.title}
          </span>
        ) : null}
      </div>
    </button>
  );
}

export default function SuccessStoriesClient({
  dictionary,
  lang,
  initialData = null,
}) {
  const labels = dictionary.success_stories || {};
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [courseFilter, setCourseFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(12);
  const [activeIndex, setActiveIndex] = useState(null);

  useEffect(() => {
    if (initialData) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const payload = await fetchSuccessStories({ lang });
        if (!cancelled) setData(payload);
      } catch {
        if (!cancelled) setData({ page: null, featured: null, testimonials: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialData, lang]);

  const pageCopy = localizePage(data?.page, lang);
  const all = data?.testimonials || [];
  const featured = data?.featured || all.find((t) => t.is_featured) || all[0] || null;

  const courseOptions = useMemo(() => {
    const map = new Map();
    all.forEach((t) => {
      if (t.course?.id) map.set(t.course.id, t.course.title || t.course.slug);
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [all]);

  const filtered = useMemo(() => {
    if (courseFilter === 'all') return all;
    return all.filter((t) => String(t.course?.id) === String(courseFilter));
  }, [all, courseFilter]);

  const gridItems = filtered.slice(0, visibleCount);

  const playList = filtered.length > 0 ? filtered : featured ? [featured] : [];

  const openAt = useCallback(
    (item) => {
      const index = playList.findIndex((t) => t.id === item.id);
      setActiveIndex(index >= 0 ? index : 0);
      try {
        pushDataLayer('testimonial_play', createEventId(), {
          video_id: item.bunny_video_id,
          person: item.person_name,
        });
      } catch {
        // non-blocking
      }
    },
    [playList]
  );

  const ctaHref = (() => {
    const link = pageCopy.ctaLink || '/courses';
    if (link.startsWith('http')) return link;
    if (link.startsWith(`/${lang}/`)) return link;
    if (link.startsWith('/')) return `/${lang}${link}`;
    return `/${lang}/${link}`;
  })();

  return (
    <PublicShell dictionary={dictionary} lang={lang}>
      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_top,_rgba(96,49,83,0.16),_transparent_60%),radial-gradient(ellipse_at_80%_20%,_rgba(190,152,83,0.18),_transparent_45%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(96,49,83,0.35),_transparent_55%),radial-gradient(ellipse_at_80%_10%,_rgba(190,152,83,0.22),_transparent_40%)]"
        />

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex min-h-[50vh] items-center justify-center gap-2 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              {labels.loading || 'Loading stories…'}
            </div>
          ) : (
            <>
              <header className="mx-auto max-w-3xl text-center">
                <span className="inline-flex rounded-full border border-plum-300 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-plum-800 backdrop-blur dark:border-gold-400/30 dark:bg-white/5 dark:text-gold-200">
                  {labels.badge || 'Real students · Real results'}
                </span>
                <h1 className="mt-5 text-3xl font-extrabold leading-tight text-gray-900 dark:text-white sm:text-5xl">
                  {pageCopy.heroTitle || labels.fallbackTitle || 'Success Stories'}
                </h1>
                <p className="mt-4 text-base text-gray-700 dark:text-gray-300 sm:text-lg">
                  {pageCopy.heroSubtitle || labels.fallbackSubtitle || ''}
                </p>
              </header>

              {featured ? (
                <section className="mx-auto mt-12 max-w-4xl">
                  <button
                    type="button"
                    onClick={() => openAt(featured)}
                    className="group relative block w-full cursor-pointer overflow-hidden rounded-[1.75rem] border border-plum-200/70 bg-black shadow-[0_30px_80px_rgba(96,49,83,0.28)] ring-1 ring-[#BE9853]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 dark:border-white/10"
                    aria-label={`${labels.playStory || 'Play story'}: ${featured.person_name || ''}`}
                  >
                    <div className="relative aspect-video w-full">
                      {featured.thumbnail_url ? (
                        <Image
                          src={featured.thumbnail_url}
                          alt=""
                          fill
                          priority
                          sizes="(max-width:1024px) 100vw, 896px"
                          className="object-cover opacity-90 transition-transform duration-700 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#603153] to-[#BE9853]" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <PlayButton size="lg" />
                      </span>
                    </div>
                  </button>
                  <div className="mt-4 text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {featured.person_name}
                    </p>
                    {featured.person_role ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{featured.person_role}</p>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {all.length === 0 ? (
                <p className="mt-16 text-center text-gray-500 dark:text-gray-400">
                  {labels.empty || 'Stories coming soon.'}
                </p>
              ) : (
                <section className="mt-16">
                  {courseOptions.length >= 2 ? (
                    <div className="mb-6 flex flex-wrap justify-center gap-2">
                      <FilterChip
                        active={courseFilter === 'all'}
                        onClick={() => {
                          setCourseFilter('all');
                          setVisibleCount(12);
                        }}
                        label={labels.allCourses || 'All courses'}
                      />
                      {courseOptions.map((opt) => (
                        <FilterChip
                          key={opt.id}
                          active={String(courseFilter) === String(opt.id)}
                          onClick={() => {
                            setCourseFilter(String(opt.id));
                            setVisibleCount(12);
                          }}
                          label={opt.title}
                        />
                      ))}
                    </div>
                  ) : null}

                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {gridItems.map((item, index) => (
                      <TestimonialCard
                        key={item.id}
                        item={item}
                        labels={labels}
                        onPlay={openAt}
                        priority={index < 3}
                      />
                    ))}
                  </div>

                  {filtered.length > visibleCount ? (
                    <div className="mt-10 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setVisibleCount((n) => n + 12)}
                        className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-plum-300 bg-white px-6 text-sm font-semibold text-plum-800 transition hover:bg-plum-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 dark:border-gold-400/40 dark:bg-white/5 dark:text-gold-200 dark:hover:bg-white/10"
                      >
                        {labels.loadMore || 'Load more'}
                      </button>
                    </div>
                  ) : null}
                </section>
              )}

              <section className="mt-20 overflow-hidden rounded-[2rem] border border-plum-200/60 bg-gradient-to-br from-[#603153] via-[#7a4068] to-[#BE9853] px-6 py-12 text-center text-white shadow-[0_30px_80px_rgba(96,49,83,0.35)] sm:px-10">
                <h2 className="text-2xl font-extrabold sm:text-3xl">
                  {pageCopy.ctaTitle || labels.ctaFallbackTitle || 'Ready to write your own success story?'}
                </h2>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href={ctaHref}
                    className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-plum-800 transition hover:bg-gold-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    {pageCopy.ctaButton || labels.exploreCourses || 'Explore courses'}
                  </Link>
                  <Link
                    href={`/${lang}/course-inquiry`}
                    className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    {labels.contactUs || dictionary.nav?.contact || 'Contact us'}
                  </Link>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      <TestimonialLightbox
        items={playList}
        index={activeIndex}
        onClose={() => setActiveIndex(null)}
        onChangeIndex={setActiveIndex}
        labels={labels}
        lang={lang}
      />
    </PublicShell>
  );
}

function FilterChip({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex min-h-10 cursor-pointer items-center rounded-full border px-4 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60',
        active
          ? 'border-[#603153] bg-plum-50 text-[#603153] dark:border-gold-400/50 dark:bg-gold-400/15 dark:text-gold-200'
          : 'border-gray-300 bg-white text-gray-700 hover:border-plum-400 hover:text-plum-800 dark:border-white/10 dark:bg-white/5 dark:text-gray-300'
      )}
    >
      {label}
    </button>
  );
}
