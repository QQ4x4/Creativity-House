<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreLessonRequest;
use App\Http\Requests\Admin\UpdateLessonRequest;
use App\Http\Resources\Admin\AdminLessonResource;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * Granular lesson CRUD scoped to a module. Progress is recalculated on delete
 * because `course_progress.completed_lessons` stores raw lesson ids.
 */
class LessonController extends Controller
{
    public function store(StoreLessonRequest $request, Course $course, Module $module): JsonResponse
    {
        $data = $request->validated();

        $data['module_id'] = $module->id;
        $data['module_name'] = $module->title_en;
        $data['sort_order'] ??= (int) $course->lessons()->max('sort_order') + 1;
        $data['bunny_library_id'] ??= config('services.bunny.library_id');

        $lesson = $course->lessons()->create($data);

        return (new AdminLessonResource($lesson))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateLessonRequest $request, Course $course, Lesson $lesson): AdminLessonResource
    {
        $data = $request->validated();

        // Moving between modules must keep the mirrored label in step.
        if (array_key_exists('module_id', $data)) {
            $target = $course->modules()->whereKey($data['module_id'])->firstOrFail();
            $data['module_name'] = $target->title_en;
        }

        $lesson->update($data);

        return new AdminLessonResource($lesson->refresh());
    }

    public function destroy(Course $course, Lesson $lesson): Response
    {
        $lesson->delete();

        return response()->noContent();
    }
}
