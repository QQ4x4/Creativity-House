'use client';

/**
 * hooks/useStudentCourses.js — state store for the "My Courses" dashboard.
 *
 * Returns the EnrolledCourse list plus the aggregate stats rendered in the
 * summary bar. Stats are derived (never stored) so they can't drift from the
 * course rows.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchEnrolledCourses } from '@/lib/student/api';
import { summarizeCourses } from '@/lib/student/types';

export function useStudentCourses() {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await fetchEnrolledCourses();
      if (mountedRef.current) setCourses(data);
    } catch (loadError) {
      if (mountedRef.current) {
        setError(loadError);
        setCourses([]);
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => summarizeCourses(courses), [courses]);

  return { courses, stats, isLoading, error, reload: load };
}

export default useStudentCourses;
