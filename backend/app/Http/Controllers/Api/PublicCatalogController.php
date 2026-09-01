<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicCourseResource;
use App\Models\Course;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublicCatalogController extends Controller
{
    /**
     * GET /api/courses — published public catalog. No auth.
     */
    public function index(): AnonymousResourceCollection
    {
        return PublicCourseResource::collection(
            Course::query()
                ->publicCatalog()
                ->with('modules.lessons')
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
        );
    }

    /**
     * GET /api/courses/{course} — one public course by id or slug. No auth.
     */
    public function show(Course $course): PublicCourseResource
    {
        abort_unless($course->is_published && $course->is_public, 404);

        $course->load('modules.lessons');

        return new PublicCourseResource($course);
    }
}
