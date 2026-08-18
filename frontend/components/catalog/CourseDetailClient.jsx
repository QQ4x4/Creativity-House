'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  BadgeCheck,
  BookOpen,
  Check,
  ChevronDown,
  Clock,
  Globe,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react';
import PublicShell from './PublicShell';
import { fetchPublicCourse } from '@/lib/catalog/api';

const MODE_ORDER = ['live', 'recorded', 'simulator'];

function formatCount(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function PricingCard({ course, mode, labels, lang, sticky = false }) {
  const selected = course.modes?.[mode] || {
    price: course.price,
    originalPrice: course.originalPrice,
    duration: course.durationLabel,
    features: [],
  };
  const hasDiscount = selected.originalPrice > selected.price;
  const savings = hasDiscount ? selected.originalPrice - selected.price : 0;
  const checkoutHref = `/${lang}/checkout?course=${encodeURIComponent(course.slug)}&mode=${encodeURIComponent(mode)}`;

  return (
    <aside
      className={`rounded-3xl border border-gray-200 bg-white p-5 shadow-xl shadow-gray-200/80 backdrop-blur-md dark:border-purple-500/25 dark:bg-[#181124]/95 dark:shadow-black/50 ${
        sticky ? 'lg:sticky lg:top-28' : ''
      }`}
    >
      <div className="flex items-end gap-3">
        <p className="text-3xl font-extrabold text-plum-700 dark:text-gold-300">${selected.price}</p>
        {hasDiscount ? (
          <p className="pb-1 text-sm text-gray-400 line-through dark:text-gray-500">${selected.originalPrice}</p>
        ) : null}
      </div>
      {hasDiscount ? (
        <span className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          {labels.discount} ${savings}
        </span>
      ) : null}

      <p className="mt-3 inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <Clock className="h-4 w-4 text-plum-600 dark:text-gold-300" aria-hidden />
        {selected.duration}
      </p>

      <Link
        href={checkoutHref}
        className="mt-5 inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-plum-700 to-plum-500 text-sm font-semibold text-white shadow-[0_0_24px_rgba(168,85,247,0.35)] transition-all duration-300 hover:from-plum-600 hover:to-plum-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
      >
        {labels.buyNow}
      </Link>

      <p className="mt-3 inline-flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200">
        <ShieldCheck className="h-4 w-4" aria-hidden />
        {labels.guarantee}
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">{labels.moneyBackHint}</p>

      <ul className="mt-5 space-y-2.5">
        {(selected.features || []).map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" aria-hidden />
            {feature}
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default function CourseDetailClient({ dictionary, lang, slug }) {
  const labels = dictionary.catalog;
  const [course, setCourse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState('live');
  const [openModule, setOpenModule] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const { data } = await fetchPublicCourse(slug, lang);
        if (cancelled) return;
        if (!data) {
          setCourse(null);
          return;
        }
        setCourse(data);
        setMode(data.defaultMode || data.availableModes?.[0] || 'live');
      } catch {
        if (!cancelled) setCourse(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, lang]);

  const availableModes = useMemo(
    () => MODE_ORDER.filter((key) => course?.availableModes?.includes(key)),
    [course]
  );

  if (!isLoading && !course) {
    return (
      <PublicShell dictionary={dictionary} lang={lang}>
        <div className="mx-auto max-w-3xl px-4 pb-20 pt-32 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{dictionary.dashboard.courseNotFound}</h1>
          <Link href={`/${lang}/courses`} className="mt-6 inline-flex min-h-[44px] items-center text-plum-700 dark:text-gold-300">
            {labels.breadcrumbCourses}
          </Link>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell dictionary={dictionary} lang={lang}>
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
        {isLoading || !course ? (
          <div className="h-[70vh] animate-pulse rounded-3xl bg-gray-200 dark:bg-[#181124]/60" />
        ) : (
          <>
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Link href={`/${lang}`} className="hover:text-plum-700 dark:hover:text-gold-300">{labels.breadcrumbHome}</Link>
              <span aria-hidden>/</span>
              <Link href={`/${lang}/courses`} className="hover:text-plum-700 dark:hover:text-gold-300">{labels.breadcrumbCourses}</Link>
              <span aria-hidden>/</span>
              <span className="text-gray-800 dark:text-gray-200">{course.title}</span>
            </nav>

            <header className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div>
                <span className="inline-flex rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-plum-800 dark:border-gold-400/30 dark:bg-gold-400/10 dark:text-gold-200">
                  {course.badge}
                </span>
                <h1 className="mt-4 text-3xl font-extrabold leading-tight text-gray-900 dark:text-white sm:text-4xl">{course.title}</h1>
                <p className="mt-3 max-w-2xl text-base text-gray-600 dark:text-gray-400">{course.subtitle}</p>

                <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-gold-400 text-gold-400" aria-hidden />
                    {Number(course.rating || 0).toFixed(1)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-plum-600 dark:text-purple-300" aria-hidden />
                    {formatCount(course.studentsCount)} {labels.students}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-plum-600 dark:text-gold-300" aria-hidden />
                    {course.language}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-plum-600 dark:text-purple-200" aria-hidden />
                    {labels.lastUpdated} {course.lastUpdated}
                  </span>
                </div>

                <fieldset className="mt-8">
                  <legend className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{labels.deliveryMode}</legend>
                  <div className="flex flex-wrap gap-2">
                    {availableModes.map((key) => {
                      const active = mode === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setMode(key)}
                          className={`min-h-[44px] cursor-pointer rounded-full border px-4 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum-400/50 dark:focus-visible:ring-amber-400/60 ${
                            active
                              ? 'border-plum-300 bg-purple-50 text-plum-800 dark:border-gold-400/50 dark:bg-gold-400/15 dark:text-gold-200'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-plum-300 hover:text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:border-purple-400/40 dark:hover:text-white'
                          }`}
                        >
                          {labels.modes[key]}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </div>

              <div className="hidden lg:block">
                <PricingCard course={course} mode={mode} labels={labels} lang={lang} sticky />
              </div>
            </header>

            <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-6">
                <section className="rounded-3xl border border-gray-200 bg-white p-6 backdrop-blur-md dark:border-purple-500/20 dark:bg-[#181124]/90">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{labels.about}</h2>
                  <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-300">{course.description}</p>
                </section>

                <section className="rounded-3xl border border-gray-200 bg-white p-6 backdrop-blur-md dark:border-purple-500/20 dark:bg-[#181124]/90">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{labels.audience}</h2>
                  <ul className="mt-4 space-y-2">
                    {(course.targetAudience || []).map((item) => (
                      <li key={item} className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-3xl border border-gray-200 bg-white p-6 backdrop-blur-md dark:border-purple-500/20 dark:bg-[#181124]/90">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{labels.outcomes}</h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {(course.learningOutcomes || []).map((item) => (
                      <li key={item} className="flex items-start gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-white/5 dark:bg-white/[0.03] dark:text-gray-200">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-3xl border border-gray-200 bg-white p-6 backdrop-blur-md dark:border-purple-500/20 dark:bg-[#181124]/90">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{labels.curriculum}</h2>
                  <div className="mt-4 space-y-2">
                    {(course.curriculum || []).map((mod, index) => {
                      const open = openModule === index;
                      return (
                        <div key={mod.title} className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10">
                          <button
                            type="button"
                            onClick={() => setOpenModule(open ? -1 : index)}
                            className="flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-start text-gray-900 transition-colors duration-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum-400/50 dark:text-white dark:hover:bg-white/5 dark:focus-visible:ring-amber-400/50"
                            aria-expanded={open}
                          >
                            <span>
                              <span className="block font-semibold">{mod.title}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{mod.duration}</span>
                            </span>
                            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden />
                          </button>
                          {open ? (
                            <ul className="space-y-1 border-t border-gray-200 px-4 py-3 text-sm text-gray-600 dark:border-white/10 dark:text-gray-300">
                              {(mod.lessons || []).map((lesson) => (
                                <li key={lesson} className="flex items-center gap-2">
                                  <BookOpen className="h-3.5 w-3.5 text-gold-400" aria-hidden />
                                  {lesson}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-3xl border border-gray-200 bg-white p-6 backdrop-blur-md dark:border-purple-500/20 dark:bg-[#181124]/90">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{labels.schedule}</h2>
                  <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-300">{course.schedule}</p>
                </section>

                <section className="rounded-3xl border border-gray-200 bg-white p-6 backdrop-blur-md dark:border-purple-500/20 dark:bg-[#181124]/90">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{labels.instructor}</h2>
                  <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
                    <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full bg-transparent">
                      <img
                        src={course.instructor.photo}
                        alt={course.instructor.name}
                        width={112}
                        height={112}
                        className="h-full w-full scale-[1.02] object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{course.instructor.name}</h3>
                      <p className="text-sm text-plum-700 dark:text-gold-300">{course.instructor.title}</p>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {course.instructor.trained} {labels.trained} · {course.instructor.countries} {labels.countries}
                      </p>
                      <ul className="mt-3 space-y-1">
                        {course.instructor.credentials.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <Award className="mt-0.5 h-4 w-4 shrink-0 text-plum-600 dark:text-gold-400" aria-hidden />
                            {item}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{course.instructor.bio}</p>
                    </div>
                  </div>
                </section>
              </div>

              <div className="hidden lg:block" aria-hidden />
            </div>

            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 backdrop-blur-md dark:border-purple-500/20 dark:bg-[#120a1c]/95 lg:hidden">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-extrabold text-plum-700 dark:text-gold-300">${(course.modes?.[mode]?.price ?? course.price)}</p>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-200">{labels.guarantee}</p>
                </div>
                <Link
                  href={`/${lang}/checkout?course=${encodeURIComponent(course.slug)}&mode=${encodeURIComponent(mode)}`}
                  className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-plum-700 to-plum-500 px-5 text-sm font-semibold text-white"
                >
                  {labels.buyNow}
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </PublicShell>
  );
}
