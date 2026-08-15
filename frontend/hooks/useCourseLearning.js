'use client';

/**
 * hooks/useCourseLearning.js — state store for the interactive learning screen.
 *
 * Loads the course + curriculum + progress, tracks which lesson is playing, and
 * owns lesson-completion toggling with an optimistic update (reverted if the
 * request fails). Completion percentage is recalculated through the same pure
 * helper the API layer uses, so the sidebar, action bar, and header bar can
 * never disagree.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchCourse, fetchCourseCurriculum, setLessonCompletion } from '@/lib/student/api';
import {
  applyLessonCompletion,
  calculateCompletionPercentage,
  groupLessonsByModule,
} from '@/lib/student/types';

/** First sensible lesson to open: resume target → first unfinished → first. */
function pickInitialLessonId(lessons, resumeLessonId) {
  if (!lessons.length) return null;

  const resume = lessons.find(
    (lesson) => String(lesson.id) === String(resumeLessonId) && !lesson.locked
  );
  if (resume) return resume.id;

  const unfinished = lessons.find((lesson) => !lesson.completed && !lesson.locked);
  if (unfinished) return unfinished.id;

  const firstUnlocked = lessons.find((lesson) => !lesson.locked);
  return (firstUnlocked || lessons[0]).id;
}

export function useCourseLearning(courseId) {
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState(null);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingLessonId, setPendingLessonId] = useState(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!courseId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: loadedCourse } = await fetchCourse(courseId);

      if (!loadedCourse) {
        if (mountedRef.current) {
          setCourse(null);
          setLessons([]);
          setProgress(null);
        }
        return;
      }

      const { data: curriculum } = await fetchCourseCurriculum(
        courseId,
        loadedCourse.progress.completedLessons
      );

      if (!mountedRef.current) return;

      const totalLessons = curriculum.lessons.length || loadedCourse.progress.totalLessons;
      const completedLessons = curriculum.lessons
        .filter((lesson) => lesson.completed)
        .map((lesson) => lesson.id);

      setCourse(loadedCourse);
      setLessons(curriculum.lessons);
      setProgress({
        ...loadedCourse.progress,
        totalLessons,
        completedLessons,
        completionPercentage: calculateCompletionPercentage(completedLessons.length, totalLessons),
      });
      setActiveLessonId(pickInitialLessonId(curriculum.lessons, loadedCourse.nextLessonId));
    } catch (loadError) {
      if (mountedRef.current) setError(loadError);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const modules = useMemo(() => groupLessonsByModule(lessons), [lessons]);

  const activeIndex = useMemo(
    () => lessons.findIndex((lesson) => String(lesson.id) === String(activeLessonId)),
    [lessons, activeLessonId]
  );

  const activeLesson = activeIndex >= 0 ? lessons[activeIndex] : null;

  const previousLesson = useMemo(() => {
    for (let index = activeIndex - 1; index >= 0; index -= 1) {
      if (!lessons[index].locked) return lessons[index];
    }
    return null;
  }, [lessons, activeIndex]);

  const nextLesson = useMemo(() => {
    for (let index = activeIndex + 1; index < lessons.length; index += 1) {
      if (!lessons[index].locked) return lessons[index];
    }
    return null;
  }, [lessons, activeIndex]);

  const selectLesson = useCallback(
    (lessonId) => {
      const target = lessons.find((lesson) => String(lesson.id) === String(lessonId));
      if (!target || target.locked) return;
      setActiveLessonId(target.id);
    },
    [lessons]
  );

  const goToPrevious = useCallback(() => {
    if (previousLesson) setActiveLessonId(previousLesson.id);
  }, [previousLesson]);

  const goToNext = useCallback(() => {
    if (nextLesson) setActiveLessonId(nextLesson.id);
  }, [nextLesson]);

  /**
   * Toggle completion for a lesson (defaults to the one playing).
   * Optimistic: the checkmark and percentage move immediately, then revert if
   * the server rejects the change.
   */
  const toggleLessonCompletion = useCallback(
    async (lessonId = activeLessonId) => {
      const lesson = lessons.find((item) => String(item.id) === String(lessonId));
      if (!lesson || !progress) return null;

      const nextCompleted = !lesson.completed;
      const previousLessons = lessons;
      const previousProgress = progress;

      setPendingLessonId(lesson.id);
      setLessons((current) =>
        current.map((item) =>
          String(item.id) === String(lesson.id) ? { ...item, completed: nextCompleted } : item
        )
      );
      setProgress((current) =>
        current ? applyLessonCompletion(current, lesson.id, nextCompleted) : current
      );

      try {
        const { data: serverProgress } = await setLessonCompletion(
          courseId,
          lesson.id,
          nextCompleted,
          applyLessonCompletion(previousProgress, lesson.id, nextCompleted)
        );

        if (mountedRef.current && serverProgress) {
          setProgress((current) => ({
            ...(current || {}),
            ...serverProgress,
            totalLessons: serverProgress.totalLessons || current?.totalLessons || 0,
          }));
        }

        return { completed: nextCompleted, progress: serverProgress };
      } catch (toggleError) {
        if (mountedRef.current) {
          setLessons(previousLessons);
          setProgress(previousProgress);
        }
        throw toggleError;
      } finally {
        if (mountedRef.current) setPendingLessonId(null);
      }
    },
    [activeLessonId, lessons, progress, courseId]
  );

  return {
    course,
    lessons,
    modules,
    progress,
    activeLesson,
    activeLessonId,
    activeIndex,
    previousLesson,
    nextLesson,
    isLoading,
    error,
    pendingLessonId,
    selectLesson,
    goToPrevious,
    goToNext,
    toggleLessonCompletion,
    reload: load,
  };
}

export default useCourseLearning;
