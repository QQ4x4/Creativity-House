<?php

namespace App\Console\Commands;

use App\Models\Course;
use App\Models\CourseProgress;
use App\Models\Lesson;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Wipe a course's dummy syllabus and inject a real module/lesson + Bunny video.
 *
 * Modules are labels on `lessons.module_name` (no separate modules table).
 *
 *   php artisan course:update-syllabus
 *   php artisan course:update-syllabus pm-foundations
 *   php artisan course:update-syllabus pmp-live-training --force
 */
class UpdateCourseSyllabusCommand extends Command
{
    private const DEFAULT_COURSE = 'pm-foundations';

    private const DEFAULT_MODULE = 'Module 1: Leadership';

    private const DEFAULT_LESSON = 'Lesson 1: Introduction to Leadership';

    private const DEFAULT_BUNNY_VIDEO_ID = '4ae24953-6c34-4080-906e-b62ab1a8f6ab';

    private const DEFAULT_BUNNY_LIBRARY_ID = '739576';

    protected $signature = 'course:update-syllabus
                            {course? : Course slug or numeric ID (default: pm-foundations)}
                            {--module=Module 1: Leadership : Module label for the sidebar}
                            {--lesson=Lesson 1: Introduction to Leadership : Lesson title}
                            {--video-id=4ae24953-6c34-4080-906e-b62ab1a8f6ab : Bunny Stream video GUID}
                            {--library-id=739576 : Bunny Stream library ID}
                            {--duration=600 : Lesson duration in seconds}
                            {--force : Skip confirmation prompt}';

    protected $description = 'Replace a course syllabus with one real module/lesson (Bunny Stream ready)';

    public function handle(): int
    {
        $course = $this->resolveCourse();

        if (! $course) {
            return self::FAILURE;
        }

        $module = (string) $this->option('module') ?: self::DEFAULT_MODULE;
        $lessonTitle = (string) $this->option('lesson') ?: self::DEFAULT_LESSON;
        $videoId = (string) $this->option('video-id') ?: self::DEFAULT_BUNNY_VIDEO_ID;
        $libraryId = (string) $this->option('library-id') ?: self::DEFAULT_BUNNY_LIBRARY_ID;
        $duration = max(0, (int) $this->option('duration'));

        $existingCount = $course->lessons()->withTrashed()->count();

        $this->table(
            ['Field', 'Value'],
            [
                ['Course', "#{$course->id} · {$course->slug} · {$course->title}"],
                ['Existing lessons (incl. soft-deleted)', (string) $existingCount],
                ['New module', $module],
                ['New lesson', $lessonTitle],
                ['Bunny library ID', $libraryId],
                ['Bunny video ID', $videoId],
            ]
        );

        if (! $this->option('force')
            && ! $this->confirm('Delete all existing lessons for this course and create the new syllabus?', true)) {
            $this->warn('Aborted. No changes made.');

            return self::SUCCESS;
        }

        $lesson = DB::transaction(function () use ($course, $module, $lessonTitle, $videoId, $libraryId, $duration): Lesson {
            // Hard-delete so soft-deleted dummy rows cannot resurface or clash.
            Lesson::withTrashed()
                ->where('course_id', $course->id)
                ->forceDelete();

            // Stale completed_lesson IDs would break progress math after the wipe.
            CourseProgress::query()
                ->where('course_id', $course->id)
                ->update([
                    'completed_lessons' => [],
                    'completion_percentage' => 0,
                    'last_lesson_id' => null,
                    'completed_at' => null,
                ]);

            return Lesson::query()->create([
                'course_id' => $course->id,
                'module_name' => $module,
                'title' => $lessonTitle,
                'bunny_video_id' => $videoId,
                'bunny_library_id' => $libraryId,
                'video_url' => null,
                'duration' => $duration,
                'pdf_resource_urls' => [],
                'is_locked' => false,
                'sort_order' => 1,
            ]);
        });

        $this->info(sprintf(
            'Syllabus updated: course #%d (%s) → lesson #%d "%s" under "%s".',
            $course->id,
            $course->slug,
            $lesson->id,
            $lesson->title,
            $lesson->module_name
        ));
        $this->line(sprintf(
            'Bunny embed: https://iframe.mediadelivery.net/embed/%s/%s',
            $lesson->bunny_library_id,
            $lesson->bunny_video_id
        ));
        $this->line('Lessons on course now: '.$course->lessons()->count());

        return self::SUCCESS;
    }

    private function resolveCourse(): ?Course
    {
        $raw = $this->argument('course');

        if ($raw === null || $raw === '') {
            if ($this->option('force') || ! $this->input->isInteractive()) {
                $raw = self::DEFAULT_COURSE;
            } else {
                $raw = $this->ask('Course slug or ID', self::DEFAULT_COURSE);
            }
        }

        $raw = trim((string) $raw);

        if ($raw === '') {
            $this->error('A course slug or ID is required.');

            return null;
        }

        $course = is_numeric($raw)
            ? Course::query()->find((int) $raw)
            : Course::query()->where('slug', $raw)->first();

        if (! $course) {
            $this->error("Course not found: {$raw}");
            $this->line('Tip: try pm-foundations or pmp-live-training.');

            return null;
        }

        return $course;
    }
}
