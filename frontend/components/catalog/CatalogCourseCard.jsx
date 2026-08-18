'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, GraduationCap, Star, Users } from 'lucide-react';
import { motionGpu, motionViewport } from '@/lib/motion';

function formatCount(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function CatalogCourseCard({ course, lang, labels, index = 0 }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const detailHref = `/${lang}/courses/${course.slug}`;
  const checkoutHref = `/${lang}/checkout?course=${encodeURIComponent(course.slug)}&mode=${encodeURIComponent(course.defaultMode)}`;
  const showCover = Boolean(course.coverImage) && !coverFailed;
  const hasDiscount = course.originalPrice > course.price;

  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={motionViewport}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className={`group flex h-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg shadow-gray-200/70 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-plum-300 hover:shadow-[0_0_32px_rgba(168,85,247,0.12)] dark:border-purple-500/20 dark:bg-[#181124]/90 dark:shadow-black/40 dark:hover:border-gold-400/40 dark:hover:shadow-[0_0_32px_rgba(168,85,247,0.18)] ${motionGpu}`}
    >
      <Link
        href={detailHref}
        className="relative block aspect-video w-full overflow-hidden transform-gpu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/60"
      >
        {showCover ? (
          <img
            src={course.coverImage}
            alt=""
            width={800}
            height={450}
            loading="lazy"
            decoding="async"
            onError={() => setCoverFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 will-change-transform backface-hidden translate-z-0 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-plum-800 via-plum-950 to-slate-900">
            <GraduationCap className="h-10 w-10 text-gold-400/60" aria-hidden />
          </div>
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#120a1c] via-[#120a1c]/20 to-transparent" />
        <span className="absolute start-3 top-3 rounded-full border border-purple-200 bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-plum-800 backdrop-blur-md dark:border-gold-400/30 dark:bg-[#181124]/80 dark:text-gold-200">
          {course.badge}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold leading-snug text-gray-900 dark:text-white">
          <Link href={detailHref} className="transition-colors duration-300 hover:text-plum-700 dark:hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50">
            {course.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{course.subtitle}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-gold-400 text-gold-400" aria-hidden />
            {Number(course.rating || 0).toFixed(1)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-plum-600 dark:text-purple-300" aria-hidden />
            {formatCount(course.studentsCount)} {labels.students}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-gold-300" aria-hidden />
            {course.durationLabel}
          </span>
        </div>

        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{course.instructorName}</p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            {hasDiscount ? (
              <p className="text-xs text-gray-500 line-through">${course.originalPrice}</p>
            ) : null}
            <p className="text-xl font-extrabold text-plum-700 dark:text-gold-300">
              ${course.price}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={detailHref}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-gray-200 px-3 text-xs font-semibold text-gray-800 transition-all duration-300 hover:border-plum-400 hover:text-plum-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 dark:border-white/15 dark:text-gray-200 dark:hover:border-gold-400/40 dark:hover:text-white"
            >
              {labels.viewDetails}
            </Link>
            <Link
              href={checkoutHref}
              className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-plum-700 to-plum-500 px-3 text-xs font-semibold text-white shadow-[0_0_18px_rgba(168,85,247,0.35)] transition-all duration-300 hover:from-plum-600 hover:to-plum-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
            >
              {labels.enrollNow}
              <ArrowRight className="h-3.5 w-3.5 chevron-flip" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
