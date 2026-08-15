'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, BookOpen, Clock, ListVideo, X } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import GlassPanel from '@/components/dashboard/GlassPanel';
import ProgressBar from '@/components/dashboard/ProgressBar';
import LessonPlayer from './LessonPlayer';
import LessonSidebar from './LessonSidebar';
import LessonActionBar from './LessonActionBar';
import LessonResources from './LessonResources';
import { useCourseLearning } from '@/hooks/useCourseLearning';
import { formatDuration } from '@/lib/student/types';
import { toastApiError } from '@/lib/toast';

/** Distraction-free learning screen: player + lesson directory + lesson actions. */
export default function LearnClient({ dictionary, lang, courseId }) {
  const isRTL = lang === 'ar';
  const labels = useMemo(
    () => ({ ...(dictionary.auth || {}), ...(dictionary.dashboard || {}) }),
    [dictionary]
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('resources');
  const drawerRef = useRef(null);

  const {
    course,
    modules,
    progress,
    activeLesson,
    activeLessonId,
    previousLesson,
    nextLesson,
    isLoading,
    pendingLessonId,
    selectLesson,
    goToPrevious,
    goToNext,
    toggleLessonCompletion,
  } = useCourseLearning(courseId);

  // Mobile drawer: lock page scroll, close on Escape, move focus into the panel.
  useEffect(() => {
    if (!drawerOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    drawerRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerOpen]);

  const handleSelectLesson = (lessonId) => {
    selectLesson(lessonId);
    setDrawerOpen(false);
  };

  const handleToggleComplete = async () => {
    try {
      const result = await toggleLessonCompletion();
      if (!result) return;
      toast.success(result.completed ? labels.markedComplete : labels.markedIncomplete);
    } catch (error) {
      toastApiError(error, labels.genericError);
    }
  };

  const sidebar = (
    <LessonSidebar
      modules={modules}
      activeLessonId={activeLessonId}
      progress={progress}
      labels={labels}
      onSelectLesson={handleSelectLesson}
    />
  );

  return (
    <DashboardShell
      dictionary={dictionary}
      lang={lang}
      showFooter={false}
      contentClassName="mx-auto w-full max-w-[1600px] px-4 pb-16 pt-24 sm:px-6 lg:px-8"
    >
      {/* Course bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={`/${lang}/my-courses`}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors duration-300 hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
          >
            <ArrowLeft className="chevron-flip h-4 w-4" aria-hidden />
            {labels.backToCourses}
          </Link>

          <h1 className="mt-1 truncate text-xl font-bold text-white sm:text-2xl">
            {isLoading ? (
              <span className="inline-block h-7 w-56 animate-pulse rounded-lg bg-white/10 align-middle" />
            ) : (
              course?.title || labels.courseNotFound
            )}
          </h1>
        </div>

        <div className="flex w-full items-center gap-3 sm:w-auto">
          <div className="w-full min-w-[10rem] sm:w-52">
            <ProgressBar
              value={progress?.completionPercentage ?? 0}
              size="sm"
              label={labels.courseProgress}
              complete={(progress?.completionPercentage ?? 0) === 100}
            />
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-purple-400/30 bg-purple-500/10 px-3.5 text-sm font-semibold text-purple-100 transition-all duration-300 hover:border-gold-400/50 hover:text-gold-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 lg:hidden"
            aria-expanded={drawerOpen}
          >
            <ListVideo className="h-4 w-4" aria-hidden />
            {labels.lessonDirectory}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-hidden>
          <div className="aspect-video w-full animate-pulse rounded-3xl bg-white/5" />
          <div className="hidden h-[28rem] animate-pulse rounded-3xl bg-white/5 lg:block" />
        </div>
      ) : !course ? (
        <GlassPanel className="mt-6 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-purple-300/70" aria-hidden />
          <p className="mt-4 text-base font-semibold text-white">{labels.courseNotFound}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">{labels.courseNotFoundHint}</p>
          <Link
            href={`/${lang}/my-courses`}
            className="mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-plum-700 to-plum-500 px-6 text-sm font-semibold text-white transition-all duration-300 hover:from-plum-600 hover:to-plum-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
          >
            {labels.backToCourses}
          </Link>
        </GlassPanel>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="min-w-0 space-y-5">
            <LessonPlayer lesson={activeLesson} labels={labels} isRTL={isRTL} />

            <LessonActionBar
              lesson={activeLesson}
              labels={labels}
              isPending={
                Boolean(activeLesson) && String(pendingLessonId) === String(activeLesson.id)
              }
              hasPrevious={Boolean(previousLesson)}
              hasNext={Boolean(nextLesson)}
              onToggleComplete={handleToggleComplete}
              onPrevious={goToPrevious}
              onNext={goToNext}
            />

            {/* Resources / lesson detail panel */}
            <GlassPanel padded={false}>
              <div
                role="tablist"
                aria-label={labels.resources}
                className="flex gap-1 border-b border-white/10 p-2"
              >
                {[
                  { id: 'resources', label: `${labels.resources} (${activeLesson?.resources?.length ?? 0})` },
                  { id: 'overview', label: labels.lessonOverview },
                ].map((panel) => (
                  <button
                    key={panel.id}
                    type="button"
                    role="tab"
                    aria-selected={activePanel === panel.id}
                    onClick={() => setActivePanel(panel.id)}
                    className={`inline-flex min-h-[44px] items-center rounded-xl px-4 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 ${
                      activePanel === panel.id
                        ? 'bg-plum-700/50 text-white'
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`}
                  >
                    {panel.label}
                  </button>
                ))}
              </div>

              <div className="p-4 sm:p-5">
                {activePanel === 'resources' ? (
                  <LessonResources resources={activeLesson?.resources || []} labels={labels} />
                ) : (
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {labels.module}
                      </dt>
                      <dd className="mt-1 text-sm text-gray-100">
                        {activeLesson?.moduleName || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {labels.duration}
                      </dt>
                      <dd className="mt-1 flex items-center gap-1.5 text-sm tabular-nums text-gray-100">
                        <Clock className="h-3.5 w-3.5 text-gold-300" aria-hidden />
                        <span dir="ltr">{formatDuration(activeLesson?.durationSeconds)}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {labels.status}
                      </dt>
                      <dd
                        className={`mt-1 text-sm font-semibold ${
                          activeLesson?.completed ? 'text-emerald-300' : 'text-gold-300'
                        }`}
                      >
                        {activeLesson?.completed ? labels.completed : labels.inProgress}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {labels.instructor}
                      </dt>
                      <dd className="mt-1 text-sm text-gray-100">
                        {course.instructorName || '—'}
                      </dd>
                    </div>
                  </dl>
                )}
              </div>
            </GlassPanel>
          </div>

          {/* Desktop lesson directory */}
          <aside className="hidden max-h-[calc(100vh-8rem)] overflow-hidden rounded-3xl border border-purple-500/20 bg-[#181124]/90 shadow-2xl shadow-black/40 backdrop-blur-md lg:sticky lg:top-24 lg:block">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Mobile slide-over lesson directory */}
      <AnimatePresence>
        {drawerOpen ? (
          <div className="fixed inset-0 z-[70] lg:hidden">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              aria-label={labels.closeDirectory}
              className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              ref={drawerRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={labels.lessonDirectory}
              initial={{ x: isRTL ? '-100%' : '100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? '-100%' : '100%' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 end-0 flex w-[min(88vw,22rem)] flex-col border-s border-purple-500/20 bg-[#181124]/98 shadow-2xl shadow-black/60 backdrop-blur-xl focus-visible:outline-none"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3">
                <span className="text-sm font-bold text-white">{labels.lessonDirectory}</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label={labels.closeDirectory}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-300 transition-colors duration-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>

              <div className="min-h-0 flex-1">{sidebar}</div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </DashboardShell>
  );
}
