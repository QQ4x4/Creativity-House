'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Award, BookOpen, Clock } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import GlassPanel from '@/components/dashboard/GlassPanel';
import StatCard from '@/components/dashboard/StatCard';
import CourseCard from '@/components/dashboard/CourseCard';
import { useStudentCourses } from '@/hooks/useStudentCourses';
import { formatLearningHours } from '@/lib/student/types';

/** Student learning hub: stat summary bar + enrolled course grid. */
export default function MyCoursesClient({ dictionary, lang }) {
  const labels = useMemo(
    () => ({ ...(dictionary.auth || {}), ...(dictionary.dashboard || {}) }),
    [dictionary]
  );

  const { courses, stats, isLoading } = useStudentCourses();

  return (
    <DashboardShell dictionary={dictionary} lang={lang}>
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{labels.myCoursesTitle}</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">{labels.myCoursesSubtitle}</p>
      </header>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={labels.summary}>
        <StatCard
          icon={BookOpen}
          tone="purple"
          index={0}
          isLoading={isLoading}
          label={labels.statCourses}
          value={stats.totalCourses}
          hint={labels.statCoursesHint}
        />
        <StatCard
          icon={Award}
          tone="gold"
          index={1}
          isLoading={isLoading}
          label={labels.statCertificates}
          value={stats.certificatesEarned}
          hint={labels.statCertificatesHint}
        />
        <StatCard
          icon={Clock}
          tone="emerald"
          index={2}
          isLoading={isLoading}
          label={labels.statHours}
          value={formatLearningHours(stats.totalLearningSeconds)}
          suffix={labels.hoursSuffix}
          hint={labels.statHoursHint}
        />
      </section>

      <section className="mt-10" aria-label={labels.enrolledCourses}>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{labels.enrolledCourses}</h2>

        {isLoading ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
            {[0, 1, 2].map((card) => (
              <div
                key={card}
                className="h-[22rem] animate-pulse rounded-3xl border border-gray-200 bg-gray-100 dark:border-purple-500/10 dark:bg-white/5"
              />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <GlassPanel className="mt-5 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-purple-300/70" aria-hidden />
            <p className="mt-4 text-base font-semibold text-gray-900 dark:text-white">{labels.noCourses}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">{labels.noCoursesHint}</p>
            <Link
              href={`/${lang}/courses`}
              className="mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-plum-700 to-plum-500 px-6 text-sm font-semibold text-white transition-all duration-300 hover:from-plum-600 hover:to-plum-400 hover:shadow-lg hover:shadow-plum-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
            >
              {labels.browseCourses}
              <ArrowRight className="chevron-flip h-4 w-4" aria-hidden />
            </Link>
          </GlassPanel>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course, index) => (
              <CourseCard
                key={course.id}
                course={course}
                lang={lang}
                labels={labels}
                index={index}
              />
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
