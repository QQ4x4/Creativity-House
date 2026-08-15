<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\CourseResource;
use App\Http\Resources\LessonResource;
use App\Http\Resources\ProgressResource;
use App\Models\Course;
use App\Models\User;
use App\Services\Student\CourseService;
use App\Services\Student\ProgressService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CourseController extends Controller
{
    public function __construct(
        private readonly CourseService $courses,
        private readonly ProgressService $progress,
    ) {}

    /**
     * GET /my-courses — every course the student has a paid order for.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return CourseResource::collection(
            $this->courses->purchasedCourses($this->user($request))
        );
    }

    /**
     * GET /courses/{course} — 403 when the student doesn't own it.
     */
    public function show(Request $request, Course $course): CourseResource
    {
        return new CourseResource(
            $this->courses->findPurchasedCourse($this->user($request), $course)
        );
    }

    /**
     * GET /courses/{course}/lessons — ordered curriculum with completion flags.
     */
    public function lessons(Request $request, Course $course): AnonymousResourceCollection
    {
        return LessonResource::collection(
            $this->courses->curriculum($this->user($request), $course)
        );
    }

    /**
     * GET /courses/{course}/progress
     */
    public function progress(Request $request, Course $course): ProgressResource
    {
        $user = $this->user($request);

        $this->courses->findPurchasedCourse($user, $course);

        return (new ProgressResource($this->progress->progressFor($user, $course)))
            ->withTotalLessons((int) $course->lessons()->count());
    }

    private function user(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();

        return $user;
    }
}
