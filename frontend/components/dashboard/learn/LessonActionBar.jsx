'use client';

import { ChevronLeft, ChevronRight, CircleCheck, Loader2 } from 'lucide-react';

/**
 * Lesson controls: completion toggle (recalculates course progress) plus
 * previous/next navigation. Arrows use the global `.chevron-flip` rule so they
 * point the right way in RTL.
 */
export default function LessonActionBar({
  lesson,
  labels,
  isPending = false,
  hasPrevious = false,
  hasNext = false,
  onToggleComplete,
  onPrevious,
  onNext,
}) {
  const isCompleted = Boolean(lesson?.completed);

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm backdrop-blur-md dark:border-purple-500/20 dark:bg-[#181124]/90 dark:shadow-xl dark:shadow-black/30 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={onToggleComplete}
        disabled={isPending || !lesson}
        aria-pressed={isCompleted}
        className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#181124] disabled:cursor-not-allowed disabled:opacity-60 ${
          isCompleted
            ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/25'
            : 'bg-gradient-to-r from-plum-700 to-plum-500 text-white hover:from-plum-600 hover:to-plum-400 hover:shadow-lg hover:shadow-plum-500/30'
        }`}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <CircleCheck className="h-4 w-4" aria-hidden />
        )}
        {isCompleted ? labels.markIncomplete : labels.markComplete}
      </button>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-300 px-4 text-sm font-medium text-gray-700 transition-all duration-300 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:text-gray-200 dark:hover:border-white/30 dark:hover:bg-white/5 dark:hover:text-white sm:flex-none"
        >
          <ChevronLeft className="chevron-flip h-4 w-4" aria-hidden />
          <span className="whitespace-nowrap">{labels.previousLesson}</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-800 transition-all duration-300 hover:border-amber-400 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gold-400/30 dark:bg-gold-400/10 dark:text-gold-200 dark:hover:border-gold-400/60 dark:hover:bg-gold-400/20 sm:flex-none"
        >
          <span className="whitespace-nowrap">{labels.nextLesson}</span>
          <ChevronRight className="chevron-flip h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
