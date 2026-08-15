<?php

namespace App\Services\Student;

use App\Models\Course;
use App\Models\CourseProgress;
use App\Models\Lesson;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Owns every write to `course_progress`.
 *
 * The completion percentage and total learning time are always DERIVED from the
 * completed-lesson set inside a locked transaction, so concurrent toggles from
 * two tabs can't corrupt the row or drift from the lesson count.
 */
class ProgressService
{
    /**
     * Progress row for a student+course, created on first read.
     * Restores a soft-deleted row instead of colliding with the unique index.
     */
    public function progressFor(User $user, Course $course): CourseProgress
    {
        /** @var CourseProgress $progress */
        $progress = CourseProgress::withTrashed()->firstOrNew([
            'user_id' => $user->id,
            'course_id' => $course->id,
        ]);

        if ($progress->trashed()) {
            $progress->restore();
        }

        if (! $progress->exists) {
            $progress->completed_lessons = [];
            $progress->completion_percentage = 0;
            $progress->total_learning_seconds = 0;
            $progress->save();
        }

        return $progress;
    }

    /**
     * Toggle one lesson and return the recalculated progress.
     *
     * @param  bool  $completed  true = mark complete, false = mark incomplete
     */
    public function setLessonCompletion(
        User $user,
        Course $course,
        int $lessonId,
        bool $completed,
    ): CourseProgress {
        return DB::transaction(function () use ($user, $course, $lessonId, $completed): CourseProgress {
            $progress = $this->lockProgress($user, $course);

            $completedIds = $progress->completedLessonIds();
            $remaining = array_values(array_filter(
                $completedIds,
                static fn (int $id): bool => $id !== $lessonId
            ));

            $nextCompleted = $completed ? [...$remaining, $lessonId] : $remaining;

            // Drop ids for lessons that were deleted since they were completed,
            // otherwise the percentage could exceed the real lesson count.
            $validIds = $this->validLessonIds($course, $nextCompleted);

            $totalLessons = (int) $course->lessons()->count();
            $percentage = $this->percentage(count($validIds), $totalLessons);

            $progress->completed_lessons = $validIds;
            $progress->completion_percentage = $percentage;
            $progress->total_learning_seconds = $this->learningSeconds($course, $validIds);
            $progress->last_lesson_id = $lessonId;

            // Stamp the first time the course hits 100%; clear it if it drops back.
            if ($percentage >= 100) {
                $progress->completed_at ??= now();
            } else {
                $progress->completed_at = null;
            }

            $progress->save();

            return $progress;
        });
    }

    /**
     * Recompute a row from scratch — useful after an admin adds or removes lessons.
     */
    public function recalculate(User $user, Course $course): CourseProgress
    {
        return DB::transaction(function () use ($user, $course): CourseProgress {
            $progress = $this->lockProgress($user, $course);

            $validIds = $this->validLessonIds($course, $progress->completedLessonIds());
            $totalLessons = (int) $course->lessons()->count();

            $progress->completed_lessons = $validIds;
            $progress->completion_percentage = $this->percentage(count($validIds), $totalLessons);
            $progress->total_learning_seconds = $this->learningSeconds($course, $validIds);

            if ($progress->completion_percentage < 100) {
                $progress->completed_at = null;
            }

            $progress->save();

            return $progress;
        });
    }

    /**
     * Row-level lock so two simultaneous toggles serialize instead of
     * overwriting each other's completed-lesson array.
     */
    private function lockProgress(User $user, Course $course): CourseProgress
    {
        $this->progressFor($user, $course);

        /** @var CourseProgress $locked */
        $locked = CourseProgress::query()
            ->where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->lockForUpdate()
            ->firstOrFail();

        return $locked;
    }

    /**
     * @param  list<int>  $lessonIds
     * @return list<int>
     */
    private function validLessonIds(Course $course, array $lessonIds): array
    {
        if ($lessonIds === []) {
            return [];
        }

        return $course->lessons()
            ->whereIn('id', $lessonIds)
            ->pluck('id')
            ->map(static fn ($id): int => (int) $id)
            ->values()
            ->all();
    }

    /**
     * Learning time derived from completed lesson durations — no client-supplied
     * totals, so it can't be inflated.
     *
     * @param  list<int>  $lessonIds
     */
    private function learningSeconds(Course $course, array $lessonIds): int
    {
        if ($lessonIds === []) {
            return 0;
        }

        return (int) $course->lessons()
            ->whereIn('id', $lessonIds)
            ->sum('duration');
    }

    private function percentage(int $completedCount, int $totalLessons): int
    {
        if ($totalLessons <= 0) {
            return 0;
        }

        return (int) max(0, min(100, (int) round(($completedCount / $totalLessons) * 100)));
    }

    /**
     * Total learning time across every course, for the dashboard stat bar.
     */
    public function totalLearningSeconds(User $user): int
    {
        return (int) CourseProgress::query()
            ->where('user_id', $user->id)
            ->sum('total_learning_seconds');
    }

    /**
     * Lesson lookup constrained to the course — callers never trust a bare id.
     */
    public function findCourseLesson(Course $course, int $lessonId): ?Lesson
    {
        /** @var Lesson|null $lesson */
        $lesson = $course->lessons()->whereKey($lessonId)->first();

        return $lesson;
    }
}
