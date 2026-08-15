<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\MarkLessonCompleteRequest;
use App\Http\Resources\ProgressResource;
use App\Models\Course;
use App\Models\User;
use App\Services\Student\ProgressService;

class ProgressController extends Controller
{
    public function __construct(private readonly ProgressService $progress) {}

    /**
     * POST /progress/complete-lesson
     * POST /courses/{course}/lessons/{lesson}/complete
     *
     * Enrollment and lesson↔course ownership are already enforced by
     * MarkLessonCompleteRequest, so this only orchestrates.
     */
    public function store(MarkLessonCompleteRequest $request): ProgressResource
    {
        return $this->apply($request, $request->shouldComplete());
    }

    /**
     * DELETE /progress/complete-lesson
     * DELETE /courses/{course}/lessons/{lesson}/complete
     */
    public function destroy(MarkLessonCompleteRequest $request): ProgressResource
    {
        return $this->apply($request, false);
    }

    private function apply(MarkLessonCompleteRequest $request, bool $completed): ProgressResource
    {
        /** @var User $user */
        $user = $request->user();

        /** @var Course $course */
        $course = Course::query()->findOrFail($request->courseId());

        $progress = $this->progress->setLessonCompletion(
            $user,
            $course,
            $request->lessonId(),
            $completed,
        );

        return (new ProgressResource($progress))
            ->withTotalLessons((int) $course->lessons()->count());
    }
}
