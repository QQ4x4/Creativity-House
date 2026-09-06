<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreLessonRequest;
use App\Http\Requests\Admin\UpdateLessonRequest;
use App\Http\Resources\Admin\AdminLessonResource;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Services\Admin\LessonResourceUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * Granular lesson CRUD scoped to a module. Progress is recalculated on delete
 * because `course_progress.completed_lessons` stores raw lesson ids.
 */
class LessonController extends Controller
{
    public function __construct(
        private readonly LessonResourceUploadService $resourceUploads,
    ) {}

    public function store(StoreLessonRequest $request, Course $course, Module $module): JsonResponse
    {
        $data = $request->validated();
        $resources = $data['resources'] ?? null;
        unset($data['resources']);

        $data['module_id'] = $module->id;
        $data['module_name'] = $module->title_en;
        $data['sort_order'] ??= (int) $course->lessons()->max('sort_order') + 1;
        $data['bunny_library_id'] ??= config('services.bunny.library_id');

        if (empty($data['sub_module_id'])) {
            $subModule = $module->subModules()->ordered()->first()
                ?? $module->subModules()->create([
                    'title_en' => 'Default Section',
                    'sort_order' => 0,
                ]);
            $data['sub_module_id'] = $subModule->id;
        }

        $lesson = $course->lessons()->create($data);

        if (is_array($resources)) {
            $this->resourceUploads->syncForLesson($lesson, $resources);
        }

        $lesson->load('resources');

        return (new AdminLessonResource($lesson))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateLessonRequest $request, Course $course, Lesson $lesson): AdminLessonResource
    {
        $data = $request->validated();
        $resources = array_key_exists('resources', $data) ? $data['resources'] : null;
        unset($data['resources']);

        // Moving between modules must keep the mirrored label in step.
        if (array_key_exists('module_id', $data)) {
            $target = $course->modules()->whereKey($data['module_id'])->firstOrFail();
            $data['module_name'] = $target->title_en;
        }

        if ($data !== []) {
            $lesson->update($data);
        }

        if (is_array($resources)) {
            $this->resourceUploads->syncForLesson($lesson, $resources);
        }

        return new AdminLessonResource($lesson->refresh()->load('resources'));
    }

    public function destroy(Course $course, Lesson $lesson): Response
    {
        $lesson->delete();

        return response()->noContent();
    }
}
