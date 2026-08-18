'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Clock, GraduationCap, PlayCircle } from 'lucide-react';
import ProgressBar from './ProgressBar';
import { formatLearningHours } from '@/lib/student/types';
import { motionGpu, motionViewport } from '@/lib/motion';

/**
 * Enrolled course tile: cover, live progress, and the resume CTA.
 * The cover uses a plain <img> with a reserved 16:9 box (no CLS) and falls back
 * to a gradient plate if the remote image fails.
 */
export default function CourseCard({ course, lang, labels, index = 0 }) {
  const [coverFailed, setCoverFailed] = useState(false);

  const percentage = course.progress?.completionPercentage ?? 0;
  const isComplete = percentage === 100;
  const completedCount = course.progress?.completedLessons?.length ?? 0;
  const totalCount = course.progress?.totalLessons ?? 0;

  const learnHref = `/${lang}/courses/${course.id}/learn`;
  const showCover = Boolean(course.coverImageUrl) && !coverFailed;

  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={motionViewport}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className={`group flex h-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-plum-300 hover:shadow-purple-900/10 dark:border-purple-500/20 dark:bg-[#181124]/90 dark:shadow-none dark:hover:border-purple-400/40 dark:hover:shadow-purple-900/30 ${motionGpu}`}
    >
      <Link
        href={learnHref}
        className="relative block aspect-video w-full overflow-hidden transform-gpu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/60"
        aria-label={`${labels.continueLearning}: ${course.title}`}
      >
        {showCover ? (
          <img
            src={course.coverImageUrl}
            alt=""
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

        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[#120a1c] via-[#120a1c]/25 to-transparent"
        />

        <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <PlayCircle className="h-14 w-14 text-white/90 drop-shadow-[0_0_16px_rgba(212,175,55,0.6)]" aria-hidden />
        </span>

        {course.certificateEarned ? (
          <span className="absolute end-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 backdrop-blur-md">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            {labels.certificate}
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        {course.level ? (
          <span className="mb-2 inline-flex w-fit rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-plum-800 dark:border-purple-400/25 dark:bg-purple-500/10 dark:text-purple-200">
            {course.level}
          </span>
        ) : null}

        <h3 className="text-base font-bold leading-snug text-gray-900 dark:text-white">
          <Link
            href={learnHref}
            className="transition-colors duration-300 hover:text-plum-700 dark:hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#181124]"
          >
            {course.title}
          </Link>
        </h3>

        {course.instructorName ? (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{course.instructorName}</p>
        ) : null}

        <div className="mt-4">
          <ProgressBar
            value={percentage}
            complete={isComplete}
            label={`${percentage}% ${labels.completed}`}
            showValue={false}
          />

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="tabular-nums">
              {completedCount} / {totalCount} {labels.lessons}
            </span>
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {formatLearningHours(course.progress?.totalLearningSeconds)} {labels.hoursShort}
            </span>
          </div>
        </div>

        <Link
          href={learnHref}
          className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-plum-700 to-plum-500 px-4 text-sm font-semibold text-white transition-all duration-300 hover:from-plum-600 hover:to-plum-400 hover:shadow-lg hover:shadow-plum-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#181124]"
        >
          {isComplete ? labels.reviewCourse : labels.continueLearning}
          <ArrowRight className="chevron-flip h-4 w-4" aria-hidden />
        </Link>
      </div>
    </motion.article>
  );
}
