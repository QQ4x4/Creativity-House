<?php

namespace App\Services\Admin;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\SubModule;
use App\Services\Student\ProgressService;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\DB;

/**
 * Owns every admin write to `modules` + `sub_modules` + `lessons`.
 *
 * The editor submits the whole tree at once, so this diffs the payload against
 * the stored rows: matched ids are updated, unmatched ids are created, and rows
 * missing from the payload are soft-deleted. Student progress is recalculated
 * afterwards because `course_progress.completed_lessons` holds raw lesson ids.
 */
class CurriculumService
{
    public function __construct(
        private readonly ProgressService $progress,
        private readonly LessonResourceUploadService $resourceUploads,
    ) {}

    /**
     * Replace a course's curriculum with the submitted tree.
     *
     * @param  list<array<string, mixed>>  $modules
     */
    public function sync(Course $course, array $modules): EloquentCollection
    {
        $modules = $this->normalizeModulesPayload($modules);

        DB::transaction(function () use ($course, $modules): void {
            $existingModuleIds = $course->modules()->pluck('id')->all();
            $existingSubModuleIds = SubModule::query()
                ->whereIn('module_id', $existingModuleIds)
                ->pluck('id')
                ->all();
            $existingLessonIds = $course->lessons()->pluck('id')->all();

            $keptModuleIds = [];
            $keptSubModuleIds = [];
            $keptLessonIds = [];
            $globalLessonOrder = 0;

            foreach (array_values($modules) as $moduleIndex => $modulePayload) {
                $module = $this->upsertModule($course, $modulePayload, $moduleIndex, $existingModuleIds);
                $keptModuleIds[] = $module->id;

                $subModules = is_array($modulePayload['sub_modules'] ?? null)
                    ? $modulePayload['sub_modules']
                    : [];

                foreach (array_values($subModules) as $subModuleIndex => $subModulePayload) {
                    $subModule = $this->upsertSubModule(
                        $module,
                        $subModulePayload,
                        $subModuleIndex,
                        $existingSubModuleIds,
                    );
                    $keptSubModuleIds[] = $subModule->id;

                    $lessons = is_array($subModulePayload['lessons'] ?? null)
                        ? $subModulePayload['lessons']
                        : [];

                    foreach (array_values($lessons) as $lessonPayload) {
                        $lesson = $this->upsertLesson(
                            $course,
                            $module,
                            $subModule,
                            $lessonPayload,
                            $globalLessonOrder,
                            $existingLessonIds,
                        );

                        $this->syncLessonResources($lesson, $lessonPayload);

                        $keptLessonIds[] = $lesson->id;
                        $globalLessonOrder++;
                    }
                }
            }

            $removedLessonIds = array_diff($existingLessonIds, $keptLessonIds);
            if ($removedLessonIds !== []) {
                Lesson::query()->whereIn('id', $removedLessonIds)->delete();
            }

            $removedSubModuleIds = array_diff($existingSubModuleIds, $keptSubModuleIds);
            if ($removedSubModuleIds !== []) {
                SubModule::query()->whereIn('id', $removedSubModuleIds)->delete();
            }

            $removedModuleIds = array_diff($existingModuleIds, $keptModuleIds);
            if ($removedModuleIds !== []) {
                Module::query()->whereIn('id', $removedModuleIds)->delete();
            }
        });

        $this->recalculateStudentProgress($course);

        return $this->tree($course);
    }

    /**
     * Rebuild `modules` (+ default sub-modules) from the legacy `lessons.module_name` labels.
     */
    public function rebuildFromLessonLabels(Course $course): void
    {
        DB::transaction(function () use ($course): void {
            $course->modules()->delete();

            $lessons = $course->lessons()->get();
            $modules = [];
            $sortOrder = 0;

            foreach ($lessons as $lesson) {
                $title = trim((string) $lesson->module_name) ?: 'Module 1';

                if (! array_key_exists($title, $modules)) {
                    $module = $course->modules()->create([
                        'title_en' => mb_substr($title, 0, 200),
                        'sort_order' => $sortOrder++,
                    ]);

                    $subModule = $module->subModules()->create([
                        'title_en' => 'Default Section',
                        'sort_order' => 0,
                    ]);

                    $modules[$title] = [$module, $subModule];
                }

                /** @var Module $module */
                /** @var SubModule $subModule */
                [$module, $subModule] = $modules[$title];

                $lesson->forceFill([
                    'module_id' => $module->id,
                    'sub_module_id' => $subModule->id,
                ])->save();
            }
        });
    }

    /**
     * Modules → sub-modules → lessons — the shape both the admin editor and
     * PublicCourseResource read.
     */
    public function tree(Course $course): EloquentCollection
    {
        return $course->modules()
            ->with([
                'subModules' => fn ($relation) => $relation->ordered()->with([
                    'lessons' => fn ($lessons) => $lessons->ordered()->with('resources'),
                ]),
                'lessons' => fn ($relation) => $relation->ordered()->with('resources'),
            ])
            ->ordered()
            ->get();
    }

    /**
     * Accept legacy `modules[].lessons` by wrapping them in a default sub-module.
     *
     * @param  list<array<string, mixed>>  $modules
     * @return list<array<string, mixed>>
     */
    private function normalizeModulesPayload(array $modules): array
    {
        return array_map(static function (array $module): array {
            if (array_key_exists('sub_modules', $module) && is_array($module['sub_modules'])) {
                return $module;
            }

            $lessons = is_array($module['lessons'] ?? null) ? $module['lessons'] : [];
            unset($module['lessons']);

            $module['sub_modules'] = [[
                'id' => null,
                'title_en' => 'Default Section',
                'title_ar' => null,
                'lessons' => $lessons,
            ]];

            return $module;
        }, array_values($modules));
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  list<int>  $existingModuleIds
     */
    private function upsertModule(Course $course, array $payload, int $sortOrder, array $existingModuleIds): Module
    {
        $attributes = [
            'title_en' => (string) $payload['title_en'],
            'title_ar' => $payload['title_ar'] ?? null,
            'duration_label_en' => $payload['duration_label_en'] ?? null,
            'duration_label_ar' => $payload['duration_label_ar'] ?? null,
            'sort_order' => $sortOrder,
        ];

        $id = $payload['id'] ?? null;

        if ($id !== null && in_array((int) $id, $existingModuleIds, true)) {
            /** @var Module $module */
            $module = Module::query()->whereKey($id)->firstOrFail();
            $module->update($attributes);

            return $module;
        }

        return $course->modules()->create($attributes);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  list<int>  $existingSubModuleIds
     */
    private function upsertSubModule(
        Module $module,
        array $payload,
        int $sortOrder,
        array $existingSubModuleIds,
    ): SubModule {
        $attributes = [
            'title_en' => (string) ($payload['title_en'] ?? 'Default Section'),
            'title_ar' => $payload['title_ar'] ?? null,
            'sort_order' => $sortOrder,
        ];

        $id = $payload['id'] ?? null;

        if ($id !== null && in_array((int) $id, $existingSubModuleIds, true)) {
            /** @var SubModule $subModule */
            $subModule = SubModule::query()->whereKey($id)->firstOrFail();

            // Guard against moving a sub-module onto another module via a stale id.
            if ((int) $subModule->module_id !== (int) $module->id) {
                return $module->subModules()->create($attributes);
            }

            $subModule->update($attributes);

            return $subModule;
        }

        return $module->subModules()->create($attributes);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  list<int>  $existingLessonIds
     */
    private function upsertLesson(
        Course $course,
        Module $module,
        SubModule $subModule,
        array $payload,
        int $sortOrder,
        array $existingLessonIds,
    ): Lesson {
        $attributes = [
            'module_id' => $module->id,
            'sub_module_id' => $subModule->id,
            // Mirrored so LessonResource's derived grouping key keeps working.
            'module_name' => $module->title_en,
            'title' => (string) $payload['title'],
            'video_url' => $payload['video_url'] ?? null,
            'bunny_video_id' => $this->nullIfBlank($payload['bunny_video_id'] ?? null),
            'bunny_library_id' => $this->nullIfBlank($payload['bunny_library_id'] ?? null),
            'duration' => (int) ($payload['duration'] ?? 0),
            'is_locked' => (bool) ($payload['is_locked'] ?? false),
            'pdf_resource_urls' => $payload['pdf_resource_urls'] ?? $payload['resources'] ?? null,
            'sort_order' => $sortOrder,
        ];

        $id = $payload['id'] ?? null;

        if ($id !== null && in_array((int) $id, $existingLessonIds, true)) {
            /** @var Lesson $lesson */
            $lesson = Lesson::query()->whereKey($id)->firstOrFail();
            $lesson->update($attributes);

            return $lesson;
        }

        return $course->lessons()->create($attributes);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function syncLessonResources(Lesson $lesson, array $payload): void
    {
        if (array_key_exists('resources', $payload) && is_array($payload['resources'])) {
            $this->resourceUploads->syncForLesson($lesson, $payload['resources']);

            return;
        }

        if (array_key_exists('pdf_resource_urls', $payload) && is_array($payload['pdf_resource_urls'])) {
            $legacy = [];

            foreach (array_values($payload['pdf_resource_urls']) as $index => $item) {
                if (is_string($item) && trim($item) !== '') {
                    $url = trim($item);
                    $legacy[] = [
                        'title' => basename(parse_url($url, PHP_URL_PATH) ?: $url) ?: 'Resource',
                        'type' => str_starts_with($url, 'http') ? 'link' : 'file',
                        'url' => $url,
                        'sort_order' => $index,
                    ];

                    continue;
                }

                if (is_array($item)) {
                    $legacy[] = $item;
                }
            }

            $this->resourceUploads->syncForLesson($lesson, $legacy);
        }
    }

    private function recalculateStudentProgress(Course $course): void
    {
        $course->progress()
            ->with('user')
            ->get()
            ->each(function ($progress) use ($course): void {
                if ($progress->user !== null) {
                    $this->progress->recalculate($progress->user, $course);
                }
            });
    }

    private function nullIfBlank(mixed $value): ?string
    {
        $value = is_string($value) ? trim($value) : $value;

        return blank($value) ? null : (string) $value;
    }
}
