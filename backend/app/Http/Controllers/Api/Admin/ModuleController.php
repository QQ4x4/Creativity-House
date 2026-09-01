<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreModuleRequest;
use App\Http\Requests\Admin\UpdateModuleRequest;
use App\Http\Resources\Admin\AdminModuleResource;
use App\Models\Course;
use App\Models\Module;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * Granular module CRUD. The editor normally saves the whole tree through
 * CurriculumController::sync; these exist for scripted / incremental edits.
 */
class ModuleController extends Controller
{
    public function store(StoreModuleRequest $request, Course $course): JsonResponse
    {
        $data = $request->validated();

        $data['sort_order'] ??= (int) $course->modules()->max('sort_order') + 1;

        $module = $course->modules()->create($data);
        $module->load('lessons');

        return (new AdminModuleResource($module))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateModuleRequest $request, Course $course, Module $module): AdminModuleResource
    {
        $module->update($request->validated());

        // Lessons mirror the module title for the student sidebar's grouping key.
        if ($request->has('title_en')) {
            $module->lessons()->update(['module_name' => $module->title_en]);
        }

        $module->load('lessons');

        return new AdminModuleResource($module);
    }

    /**
     * Lessons cascade to soft-deleted too — a module with no lessons is the
     * only safe end state, since `lessons.module_id` is nullOnDelete.
     */
    public function destroy(Course $course, Module $module): Response
    {
        $module->lessons()->delete();
        $module->delete();

        return response()->noContent();
    }
}
