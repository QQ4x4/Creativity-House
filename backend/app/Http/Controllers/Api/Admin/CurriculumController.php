<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SyncCurriculumRequest;
use App\Http\Resources\Admin\AdminModuleResource;
use App\Models\Course;
use App\Services\Admin\CurriculumService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CurriculumController extends Controller
{
    public function __construct(
        private readonly CurriculumService $curriculum,
    ) {}

    /**
     * GET /api/v1/admin/courses/{course}/curriculum
     */
    public function show(Course $course): AnonymousResourceCollection
    {
        return AdminModuleResource::collection($this->curriculum->tree($course));
    }

    /**
     * PUT /api/v1/admin/courses/{course}/curriculum
     *
     * Whole-tree save. Modules and lessons absent from the payload are removed,
     * and enrolled students' progress is recalculated against the new lesson set.
     */
    public function sync(SyncCurriculumRequest $request, Course $course): AnonymousResourceCollection
    {
        $modules = $this->curriculum->sync($course, $request->validated('modules', []));

        return AdminModuleResource::collection($modules);
    }
}
