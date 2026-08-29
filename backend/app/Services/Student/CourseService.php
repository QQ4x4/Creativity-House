<?php

namespace App\Services\Student;

use App\Models\Course;
use App\Models\CourseProgress;
use App\Models\Lesson;
use App\Models\User;
use App\Services\Certificates\CertificateService;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\Eloquent\Relations\Relation;

/**
 * Read side of the Student Portal course library.
 *
 * Every query is scoped to paid orders, so an unenrolled course can never be
 * returned even if its id is guessed. Certificates are resolved via the
 * isolated CertificateService — never from progress percentage.
 */
class CourseService
{
    public function __construct(
        private readonly EnrollmentService $enrollment,
        private readonly ProgressService $progress,
        private readonly CertificateService $certificates,
    ) {}

    /**
     * Courses the student owns, ready for CourseResource.
     *
     * Query budget: 1 for courses (+lesson aggregates), 1 for progress rows,
     * 1 for slim lesson rows, 1 for enrollment dates, 1 for certificates. No N+1.
     *
     * @return EloquentCollection<int, Course>
     */
    public function purchasedCourses(User $user): EloquentCollection
    {
        /** @var EloquentCollection<int, Course> $courses */
        $courses = Course::query()
            ->purchasedBy($user->id)
            ->withCount('lessons')
            ->withSum('lessons', 'duration')
            ->with([
                // Eager-load constraints receive a Relation, not a Builder.
                'progressForUser' => fn (Relation $relation) => $relation->where('user_id', $user->id),
                // Slim projection: enough to pick the resume lesson without
                // shipping full lesson payloads in the listing.
                'lessons' => fn (Relation $relation) => $relation->select(['id', 'course_id', 'sort_order', 'is_locked']),
            ])
            ->orderBy('sort_order')
            ->orderBy('title')
            ->get();

        $courseIds = $courses->pluck('id')->all();

        $enrollmentDates = $this->enrollment->enrollmentDates($user->id, $courseIds);
        $certificateMap = $this->certificates->hasCertificatesMap($user->id, $courseIds);

        foreach ($courses as $course) {
            // Paid order is enrollment — create a progress row if missing so the
            // listing never drops a purchased course for lack of progress data.
            if ($course->progressForUser === null) {
                $course->setRelation(
                    'progressForUser',
                    $this->progress->progressFor($user, $course)
                );
            }

            $course->setAttribute('enrolled_at', $enrollmentDates[$course->id] ?? null);
            $course->setAttribute('next_lesson_id', $this->resolveNextLessonId($course));
            $course->setAttribute('has_certificate', $certificateMap[$course->id] ?? false);

            // Drop the slim lessons so the listing response stays lean —
            // CourseResource only serializes lessons when they're loaded.
            $course->unsetRelation('lessons');
        }

        return $courses;
    }

    /**
     * A single owned course. Throws 403 when the student has no paid order.
     */
    public function findPurchasedCourse(User $user, Course $course): Course
    {
        $this->enrollment->assertEnrolled($user, $course);

        $course->loadCount('lessons');
        $course->loadSum('lessons', 'duration');
        $course->load([
            'progressForUser' => fn (Relation $relation) => $relation->where('user_id', $user->id),
            'lessons' => fn (Relation $relation) => $relation->select(['id', 'course_id', 'sort_order', 'is_locked']),
        ]);

        if ($course->progressForUser === null) {
            $course->setRelation(
                'progressForUser',
                $this->progress->progressFor($user, $course)
            );
        }

        $course->setAttribute('enrolled_at', $this->enrollment->enrolledAt($user->id, $course->id));
        $course->setAttribute('next_lesson_id', $this->resolveNextLessonId($course));
        $course->setAttribute(
            'has_certificate',
            $this->certificates->hasCertificate($user->id, $course->id)
        );
        $course->unsetRelation('lessons');

        return $course;
    }

    /**
     * Ordered curriculum with each lesson's completion flag applied from the
     * student's progress row.
     *
     * @return EloquentCollection<int, Lesson>
     */
    public function curriculum(User $user, Course $course): EloquentCollection
    {
        $this->enrollment->assertEnrolled($user, $course);

        $progress = $this->progress->progressFor($user, $course);
        $completed = $progress->completedLessonIds();

        /** @var EloquentCollection<int, Lesson> $lessons */
        $lessons = $course->lessons()->get();

        foreach ($lessons as $lesson) {
            $lesson->setAttribute('is_completed', in_array($lesson->id, $completed, true));
        }

        return $lessons;
    }

    /**
     * Resume target: the last lesson watched, otherwise the first unlocked lesson
     * the student hasn't finished, otherwise the first lesson.
     *
     * Expects the slim `lessons` relation and `progressForUser` to be loaded.
     */
    private function resolveNextLessonId(Course $course): ?int
    {
        /** @var CourseProgress|null $progress */
        $progress = $course->relationLoaded('progressForUser') ? $course->progressForUser : null;

        if ($progress?->last_lesson_id !== null) {
            return $progress->last_lesson_id;
        }

        if (! $course->relationLoaded('lessons')) {
            return null;
        }

        $completed = $progress?->completedLessonIds() ?? [];

        $next = $course->lessons
            ->first(fn (Lesson $lesson): bool => ! $lesson->is_locked && ! in_array($lesson->id, $completed, true));

        return $next?->id ?? $course->lessons->first()?->id;
    }
}
