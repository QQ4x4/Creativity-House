'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Search } from 'lucide-react';
import PublicShell from './PublicShell';
import CatalogCourseCard from './CatalogCourseCard';
import { CATALOG_CATEGORIES } from '@/lib/catalog/data';
import { fetchPublicCatalog } from '@/lib/catalog/api';

export default function CourseCatalogClient({ dictionary, lang }) {
  const labels = dictionary.catalog;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const filterRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const { data } = await fetchPublicCatalog(lang);
        if (!cancelled) setCourses(Array.isArray(data) ? data.filter(Boolean) : []);
      } catch {
        if (!cancelled) setCourses([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => {
    if (!filterOpen) return undefined;

    const onPointerDown = (event) => {
      if (!filterRef.current?.contains(event.target)) {
        setFilterOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setFilterOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [filterOpen]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesFilter = filter === 'all' || course.category === filter;
      if (!matchesFilter) return false;
      if (!needle) return true;
      return [course.title, course.subtitle, course.badge, course.instructorName]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [courses, filter, query]);

  return (
    <PublicShell dictionary={dictionary} lang={lang}>
      <section className="relative z-30 px-4 pb-8 pt-28 sm:px-6 lg:px-8">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 start-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-plum-600/20 blur-3xl" />
          <div className="absolute bottom-0 end-0 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <span className="inline-flex rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-plum-800 dark:border-gold-400/30 dark:bg-gold-400/10 dark:text-gold-200">
            {labels.heroBadge}
          </span>
          <h1 className="mt-5 max-w-3xl text-3xl font-extrabold leading-tight text-gray-900 dark:text-white sm:text-5xl">
            {labels.heroTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-gray-600 dark:text-gray-400 sm:text-lg">{labels.heroSubtitle}</p>

          <div className="relative z-50 mb-12 mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative block flex-1">
              <span className="sr-only">{labels.searchLabel}</span>
              <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={labels.searchPlaceholder}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white pe-4 ps-11 text-sm text-gray-900 placeholder:text-gray-400 backdrop-blur-md outline-none transition-all duration-300 focus:border-plum-400 focus:ring-2 focus:ring-plum-400/30 dark:border-purple-500/25 dark:bg-[#181124]/90 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-gold-400/50 dark:focus:ring-amber-400/40"
              />
            </label>

            <div ref={filterRef} className="relative w-full shrink-0 lg:w-auto">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={filterOpen}
                aria-label={labels.filterLabel}
                onClick={() => setFilterOpen((open) => !open)}
                className="inline-flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 shadow-sm shadow-gray-200/80 backdrop-blur-md transition-all duration-300 hover:border-plum-300 hover:text-gray-900 hover:shadow-[0_0_24px_rgba(168,85,247,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum-400/50 dark:border-purple-500/25 dark:bg-[#181124]/90 dark:text-gray-200 dark:shadow-black/30 dark:hover:border-gold-400/40 dark:hover:text-white dark:hover:shadow-[0_0_24px_rgba(168,85,247,0.22)] dark:focus-visible:ring-amber-400/60 lg:min-w-[18rem]"
              >
                <span className="truncate">
                  {labels.filterLabel}: {labels.filters[filter]}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-gold-300 transition-transform duration-300 ${filterOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>

              <AnimatePresence>
                {filterOpen ? (
                  <motion.ul
                    key="catalog-filter-menu"
                    role="listbox"
                    aria-label={labels.filterLabel}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-gray-200 bg-white/95 py-1.5 shadow-2xl shadow-gray-300/70 backdrop-blur-md dark:border-purple-500/25 dark:bg-[#181124]/95 dark:shadow-black/50"
                  >
                    {CATALOG_CATEGORIES.map((key) => {
                      const active = filter === key;
                      return (
                        <li key={key} role="none">
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            onClick={() => {
                              setFilter(key);
                              setFilterOpen(false);
                            }}
                            className={`flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-3 px-4 text-start text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-plum-400/50 dark:focus-visible:ring-amber-400/50 ${
                              active
                                ? 'bg-purple-50 text-plum-800 dark:bg-gold-400/10 dark:text-gold-200'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white'
                            }`}
                          >
                            <span>{labels.filters[key]}</span>
                            {active ? <Check className="h-4 w-4 shrink-0 text-gold-300" aria-hidden /> : null}
                          </button>
                        </li>
                      );
                    })}
                  </motion.ul>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {isLoading
            ? [0, 1, 2, 3, 4, 5].map((slot) => (
                <div key={slot} className="h-[420px] animate-pulse rounded-3xl border border-gray-200 bg-gray-200/80 dark:border-purple-500/10 dark:bg-[#181124]/60" />
              ))
            : null}

          {!isLoading && visible.length === 0 ? (
            <p className="col-span-full rounded-3xl border border-gray-200 bg-white p-8 text-center text-gray-600 backdrop-blur-md dark:border-purple-500/20 dark:bg-[#181124]/90 dark:text-gray-400">
              {labels.empty}
            </p>
          ) : null}

          {!isLoading
            ? visible.map((course, index) => (
                <CatalogCourseCard
                  key={course.slug}
                  course={course}
                  lang={lang}
                  labels={labels}
                  index={index}
                />
              ))
            : null}
        </div>
      </section>
    </PublicShell>
  );
}
