<?php

namespace App\Services\Admin;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Services\Student\ProgressService;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\DB;

/**
 * Owns every admin write to `modules` + `lessons`.
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
        DB::transaction(function () use ($course, $modules): void {
            $existingModuleIds = $course->modules()->pluck('id')->all();
            $existingLessonIds = $course->lessons()->pluck('id')->all();

            $keptModuleIds = [];
            $keptLessonIds = [];

            foreach (array_values($modules) as $moduleIndex => $modulePayload) {
                $module = $this->upsertModule($course, $modulePayload, $moduleIndex, $existingModuleIds);
                $keptModuleIds[] = $module->id;

                $lessons = is_array($modulePayload['lessons'] ?? null) ? $modulePayload['lessons'] : [];

                foreach (array_values($lessons) as $lessonIndex => $lessonPayload) {
                    $lesson = $this->upsertLesson(
                        $course,
                        $module,
                        $lessonPayload,
                        $this->globalLessonOrder($modules, $moduleIndex, $lessonIndex),
                        $existingLessonIds,
                    );

                    $this->syncLessonResources($lesson, $lessonPayload);

                    $keptLessonIds[] = $lesson->id;
                }
            }

            $removedLessonIds = array_diff($existingLessonIds, $keptLessonIds);
            if ($removedLessonIds !== []) {
                Lesson::query()->whereIn('id', $removedLessonIds)->delete();
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
     * Rebuild `modules` from the legacy `lessons.module_name` labels.
     *
     * Seeders and the bulk-import commands write lessons directly with a module
     * label and no module row. Calling this afterwards promotes those labels
     * into real modules so the public syllabus preview stays in sync with the
     * player sidebar.
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
                    $modules[$title] = $course->modules()->create([
                        'title_en' => mb_substr($title, 0, 200),
                        'sort_order' => $sortOrder++,
                    ]);
                }

                $lesson->forceFill(['module_id' => $modules[$title]->id])->save();
            }
        });
    }

    /**
     * Modules with their lessons, ordered — the shape both the admin editor and
     * PublicCourseResource read.
     */
    public function tree(Course $course): EloquentCollection
    {
        return $course->modules()
            ->with(['lessons' => fn ($relation) => $relation->ordered()->with('resources')])
            ->ordered()
            ->get();
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

        // An id the course doesn't own is treated as "create new" rather than
        // an error, so a stale client cache can't reassign another course's module.
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
     * @param  list<int>  $existingLessonIds
     */
    private function upsertLesson(
        Course $course,
        Module $module,
        array $payload,
        int $sortOrder,
        array $existingLessonIds,
    ): Lesson {
        $attributes = [
            'module_id' => $module->id,
            // Mirrored so LessonResource's derived grouping key keeps working.
            'module_name' => $module->title_en,
            'title' => (string) $payload['title'],
            'video_url' => $payload['video_url'] ?? null,
            'bunny_video_id' => $this->nullIfBlank($payload['bunny_video_id'] ?? null),
            'bunny_library_id' => $this->nullIfBlank($payload['bunny_library_id'] ?? null),
            'duration' => (int) ($payload['duration'] ?? 0),
            'is_locked' => (bool) ($payload['is_locked'] ?? false),
            // Kept for BC; authoritative rows live in lesson_resources via syncLessonResources().
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

        // Legacy editors still send flat URL strings.
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

    /**
     * Lessons keep a course-wide `sort_order` (the student sidebar orders by it
     * across modules), so flatten the tree position into a single sequence.
     *
     * @param  list<array<string, mixed>>  $modules
     */
    private function globalLessonOrder(array $modules, int $moduleIndex, int $lessonIndex): int
    {
        $offset = 0;

        foreach (array_values($modules) as $index => $module) {
            if ($index >= $moduleIndex) {
                break;
            }

            $offset += count(is_array($module['lessons'] ?? null) ? $module['lessons'] : []);
        }

        return $offset + $lessonIndex;
    }

    /**
     * Adding or removing lessons changes the denominator for every enrolled
     * student, and can leave completed ids pointing at deleted rows.
     */
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
