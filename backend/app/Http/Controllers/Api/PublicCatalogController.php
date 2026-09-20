<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicCourseResource;
use App\Models\Course;
use App\Services\Student\EnrollmentService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublicCatalogController extends Controller
{
    public function __construct(private readonly EnrollmentService $enrollment) {}

    /**
     * GET /api/courses — published public catalog.
     * When a Sanctum session is present, each course includes is_enrolled.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        // Catalog cards only need pricing tiers — skip curriculum eager-loads
        // that previously exploded response time on local.
        $courses = Course::query()
            ->publicCatalog()
            ->with(['pricingTiers'])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['courses.*']);

        $enrolledIds = [];
        $user = $request->user('sanctum') ?? auth('sanctum')->user();
        if ($user) {
            $enrolledIds = $this->enrollment->enrolledCourseIdMap(
                (int) $user->id,
                $courses->pluck('id')->map(fn ($id) => (int) $id)->all()
            );
        }

        $resources = $courses->map(
            fn (Course $course) => (new PublicCourseResource($course))
                ->withIsEnrolled(isset($enrolledIds[(int) $course->id]))
        );

        return PublicCourseResource::collection($resources);
    }

    /**
     * GET /api/courses/{course} — one public course by id or slug.
     * When a Sanctum session is present, includes is_enrolled for the buyer.
     */
    public function show(Request $request, Course $course): PublicCourseResource
    {
        abort_unless($course->is_published && $course->is_public, 404);

        $course->load(['modules.subModules.lessons', 'modules.lessons', 'pricingTiers']);

        $isEnrolled = false;
        $user = $request->user('sanctum') ?? auth('sanctum')->user();
        if ($user) {
            $isEnrolled = $this->enrollment->isEnrolled((int) $user->id, (int) $course->id);
        }

        return (new PublicCourseResource($course))->withIsEnrolled($isEnrolled);
    }
}
