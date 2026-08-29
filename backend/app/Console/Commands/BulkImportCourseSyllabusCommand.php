<?php

namespace App\Console\Commands;

use App\Models\Course;
use App\Models\CourseProgress;
use App\Models\Lesson;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Throwable;

/**
 * @temporary
 *
 * Bulk-import a PMP syllabus from `storage/app/pmp-syllabus.json` into the
 * "PMP® Live Training Full Program" course. DELETE this command and the JSON
 * file once the Admin Dashboard can manage curriculum.
 *
 *   php artisan course:bulk-import
 *   php artisan course:bulk-import --force
 *
 * JSON shape (array of modules):
 * [
 *   {
 *     "module_title": "Module 1: …",
 *     "lessons": [
 *       { "title": "Lesson 1: …", "bunny_video_id": "uuid-or-guid" }
 *     ]
 *   }
 * ]
 */
class BulkImportCourseSyllabusCommand extends Command
{
    /** @temporary — default target for this one-off import */
    private const COURSE_SLUG = 'pmp-live-training';

    /** @temporary — syllabus file path relative to storage/app */
    private const SYLLABUS_FILE = 'pmp-syllabus.json';

    /** @temporary — Bunny library used by the Next.js player */
    private const BUNNY_LIBRARY_ID = '739576';

    protected $signature = 'course:bulk-import
                            {--file=pmp-syllabus.json : JSON file under storage/app}
                            {--library-id=739576 : Bunny Stream library ID applied to every lesson}
                            {--force : Skip confirmation prompt}';

    protected $description = '@temporary Bulk-import PMP syllabus JSON into pmp-live-training (delete when Admin UI ships)';

    public function handle(): int
    {
        // @temporary — resolve the production PMP course only
        $course = Course::query()->where('slug', self::COURSE_SLUG)->first();

        if (! $course) {
            $this->error('Course "'.self::COURSE_SLUG.'" not found. Run PublicCatalogSeeder first.');

            return self::FAILURE;
        }

        $relative = (string) $this->option('file') ?: self::SYLLABUS_FILE;
        $path = storage_path('app/'.ltrim(str_replace(['\\', '/'], DIRECTORY_SEPARATOR, $relative), DIRECTORY_SEPARATOR));

        if (! File::exists($path)) {
            $this->error("Syllabus file not found: {$path}");

            return self::FAILURE;
        }

        try {
            /** @var list<array{module_title?: string, lessons?: list<array{title?: string, bunny_video_id?: string}>}> $modules */
            $modules = json_decode(File::get($path), true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable $exception) {
            $this->error('Invalid JSON in '.$relative.': '.$exception->getMessage());

            return self::FAILURE;
        }

        if (! is_array($modules) || $modules === []) {
            $this->error('Syllabus JSON must be a non-empty array of modules.');

            return self::FAILURE;
        }

        $plannedLessons = 0;
        foreach ($modules as $module) {
            $plannedLessons += count($module['lessons'] ?? []);
        }

        $libraryId = (string) ($this->option('library-id') ?: self::BUNNY_LIBRARY_ID);
        $existingCount = $course->lessons()->withTrashed()->count();

        $this->table(
            ['Field', 'Value'],
            [
                ['Course', "#{$course->id} · {$course->slug} · {$course->title}"],
                ['JSON file', $path],
                ['Modules in JSON', (string) count($modules)],
                ['Lessons in JSON', (string) $plannedLessons],
                ['Existing lessons (will wipe)', (string) $existingCount],
                ['Bunny library ID', $libraryId],
            ]
        );

        if (! $this->option('force')
            && ! $this->confirm('Wipe existing lessons for this course and import from JSON?', true)) {
            $this->warn('Aborted. No changes made.');

            return self::SUCCESS;
        }

        [$moduleCount, $lessonCount] = DB::transaction(function () use ($course, $modules, $libraryId): array {
            // @temporary — hard-delete so re-runs never duplicate soft-deleted rows
            Lesson::withTrashed()
                ->where('course_id', $course->id)
                ->forceDelete();

            CourseProgress::query()
                ->where('course_id', $course->id)
                ->update([
                    'completed_lessons' => [],
                    'completion_percentage' => 0,
                    'last_lesson_id' => null,
                    'completed_at' => null,
                ]);

            $createdModules = 0;
            $createdLessons = 0;
            $sortOrder = 0;

            foreach ($modules as $moduleIndex => $module) {
                $moduleTitle = trim((string) ($module['module_title'] ?? ''));
                $lessons = $module['lessons'] ?? [];

                if ($moduleTitle === '') {
                    $this->warn('Skipping module at index '.$moduleIndex.' (missing module_title).');

                    continue;
                }

                if (! is_array($lessons) || $lessons === []) {
                    $this->warn("Module \"{$moduleTitle}\" has no lessons — skipped.");

                    continue;
                }

                $createdModules++;

                foreach ($lessons as $lessonIndex => $lessonData) {
                    $title = trim((string) ($lessonData['title'] ?? ''));
                    $videoId = trim((string) ($lessonData['bunny_video_id'] ?? ''));

                    if ($title === '') {
                        $this->warn("Skipping lesson {$lessonIndex} under \"{$moduleTitle}\" (missing title).");

                        continue;
                    }

                    $sortOrder++;

                    Lesson::query()->create([
                        'course_id' => $course->id,
                        'module_name' => $moduleTitle,
                        'title' => $title,
                        'bunny_video_id' => $videoId !== '' ? $videoId : null,
                        'bunny_library_id' => $libraryId,
                        'video_url' => null,
                        'duration' => (int) ($lessonData['duration'] ?? 600),
                        'pdf_resource_urls' => [],
                        'is_locked' => false,
                        'sort_order' => $sortOrder,
                    ]);

                    $createdLessons++;
                }
            }

            return [$createdModules, $createdLessons];
        });

        // @temporary — success summary for console / deploy logs
        $this->info(sprintf(
            'Bulk import complete for "%s": %d module(s), %d lesson(s) created.',
            $course->slug,
            $moduleCount,
            $lessonCount
        ));
        $this->comment('@temporary — delete BulkImportCourseSyllabusCommand + storage/app/pmp-syllabus.json when Admin UI is ready.');

        return self::SUCCESS;
    }
}
