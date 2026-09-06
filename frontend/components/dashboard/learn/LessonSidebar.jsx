'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Lock, Play, Unlock } from 'lucide-react';
import ProgressBar from '@/components/dashboard/ProgressBar';
import { formatDuration } from '@/lib/student/types';

function LessonRow({ lesson, activeLessonId, labels, onSelectLesson }) {
  const isActive = String(lesson.id) === String(activeLessonId);

  return (
    <li>
      <button
        type="button"
        disabled={lesson.locked}
        onClick={() => onSelectLesson(lesson.id)}
        aria-current={isActive ? 'true' : undefined}
        className={`flex min-h-[44px] w-full items-start gap-2.5 rounded-xl px-3 py-2 text-start transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 ${
          isActive
            ? 'border border-gold-400/40 bg-plum-700/40 shadow-[0_0_16px_rgba(212,175,55,0.2)]'
            : lesson.locked
              ? 'cursor-not-allowed opacity-55'
              : 'border border-transparent hover:bg-gray-100 dark:hover:bg-white/[0.06]'
        }`}
      >
        <span
          className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
            lesson.completed
              ? 'bg-emerald-400/15 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.35)]'
              : isActive
                ? 'bg-gold-400/20 text-gold-300 shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                : lesson.locked
                  ? 'bg-gray-100 text-gray-500 dark:bg-white/5'
                  : 'bg-gray-100 text-gray-400 dark:bg-white/5'
          }`}
          aria-hidden
        >
          {lesson.completed ? (
            <Check className="h-3 w-3" strokeWidth={3} />
          ) : lesson.locked ? (
            <Lock className="h-3 w-3" />
          ) : isActive ? (
            <Play className="h-2.5 w-2.5" />
          ) : (
            <Unlock className="h-3 w-3" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={`block text-sm leading-snug ${
              isActive
                ? 'font-semibold text-white'
                : lesson.completed
                  ? 'text-gray-600 dark:text-gray-300'
                  : 'text-gray-800 dark:text-gray-200'
            }`}
          >
            {lesson.title}
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-[11px] tabular-nums text-gray-500">
            <span dir="ltr">{formatDuration(lesson.durationSeconds)}</span>
            {isActive ? (
              <span className="font-semibold text-gold-300">{labels.nowPlaying}</span>
            ) : null}
            {lesson.locked ? <span>{labels.locked}</span> : null}
          </span>
        </span>
      </button>
    </li>
  );
}

function shouldShowSubModules(module) {
  const subs = module.subModules;
  if (!Array.isArray(subs) || subs.length === 0) return false;
  if (subs.length > 1) return true;
  const name = String(subs[0]?.name || '').trim().toLowerCase();
  return name !== '' && name !== 'default section';
}

/**
 * Lesson directory: collapsible module folders with optional sub-module chapters.
 * Rendered inline on desktop and inside the mobile slide-over drawer — same
 * component, so both stay in sync.
 */
export default function LessonSidebar({
  modules,
  activeLessonId,
  progress,
  labels,
  onSelectLesson,
}) {
  const [openModules, setOpenModules] = useState(() => new Set());
  const [openSubModules, setOpenSubModules] = useState(() => new Set());

  useEffect(() => {
    const owning = modules.find((module) =>
      module.lessons.some((lesson) => String(lesson.id) === String(activeLessonId))
    );
    if (!owning) return;

    setOpenModules((current) => {
      if (current.has(String(owning.id))) return current;
      const next = new Set(current);
      next.add(String(owning.id));
      return next;
    });

    const owningSub = (owning.subModules || []).find((sub) =>
      sub.lessons.some((lesson) => String(lesson.id) === String(activeLessonId))
    );
    if (!owningSub) return;

    const subKey = `${owning.id}::${owningSub.id}`;
    setOpenSubModules((current) => {
      if (current.has(subKey)) return current;
      const next = new Set(current);
      next.add(subKey);
      return next;
    });
  }, [modules, activeLessonId]);

  const toggleModule = (moduleId) => {
    setOpenModules((current) => {
      const next = new Set(current);
      const key = String(moduleId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSubModule = (moduleId, subModuleId) => {
    setOpenSubModules((current) => {
      const next = new Set(current);
      const key = `${moduleId}::${subModuleId}`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 p-4 dark:border-white/10">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
          {labels.lessonDirectory}
        </p>
        <div className="mt-3">
          <ProgressBar
            value={progress?.completionPercentage ?? 0}
            size="sm"
            label={`${progress?.completedLessons?.length ?? 0} / ${progress?.totalLessons ?? 0} ${labels.lessons}`}
            complete={(progress?.completionPercentage ?? 0) === 100}
          />
        </div>
      </div>

      <nav
        aria-label={labels.lessonDirectory}
        className="glass-country-dropdown-scroll flex-1 overflow-y-auto p-2"
      >
        {modules.map((module, moduleIndex) => {
          const isOpen = openModules.has(String(module.id));
          const moduleCompleted = module.lessons.every((lesson) => lesson.completed);
          const showSubs = shouldShowSubModules(module);

          return (
            <div key={module.id} className="mb-1.5">
              <button
                type="button"
                onClick={() => toggleModule(module.id)}
                aria-expanded={isOpen}
                className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-start transition-colors duration-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 dark:hover:bg-white/[0.06]"
              >
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-gold-400 transition-transform duration-300 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {module.name || `${labels.module} ${moduleIndex + 1}`}
                  </span>
                  <span className="mt-0.5 block text-[11px] tabular-nums text-gray-500">
                    {module.lessons.filter((lesson) => lesson.completed).length} /{' '}
                    {module.lessons.length} {labels.lessons}
                  </span>
                </span>
                {moduleCompleted ? (
                  <span
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"
                    aria-label={labels.completed}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                ) : null}
              </button>

              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden ps-3"
                  >
                    {showSubs ? (
                      (module.subModules || []).map((subModule) => {
                        const subKey = `${module.id}::${subModule.id}`;
                        const subOpen = openSubModules.has(subKey);

                        return (
                          <div key={subKey} className="mb-1">
                            <button
                              type="button"
                              onClick={() => toggleSubModule(module.id, subModule.id)}
                              aria-expanded={subOpen}
                              className="flex min-h-[40px] w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]"
                            >
                              <ChevronDown
                                className={`h-3.5 w-3.5 shrink-0 text-gold-400/80 transition-transform duration-300 ${
                                  subOpen ? 'rotate-180' : ''
                                }`}
                                aria-hidden
                              />
                              <span className="min-w-0 flex-1 truncate">{subModule.name}</span>
                              <span className="tabular-nums text-[10px] text-gray-500">
                                {subModule.lessons.length}
                              </span>
                            </button>

                            <AnimatePresence initial={false}>
                              {subOpen ? (
                                <motion.ul
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden ps-2"
                                >
                                  {subModule.lessons.map((lesson) => (
                                    <LessonRow
                                      key={lesson.id}
                                      lesson={lesson}
                                      activeLessonId={activeLessonId}
                                      labels={labels}
                                      onSelectLesson={onSelectLesson}
                                    />
                                  ))}
                                </motion.ul>
                              ) : null}
                            </AnimatePresence>
                          </div>
                        );
                      })
                    ) : (
                      <ul>
                        {module.lessons.map((lesson) => (
                          <LessonRow
                            key={lesson.id}
                            lesson={lesson}
                            activeLessonId={activeLessonId}
                            labels={labels}
                            onSelectLesson={onSelectLesson}
                          />
                        ))}
                      </ul>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
