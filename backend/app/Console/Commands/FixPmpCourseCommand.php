<?php

namespace App\Console\Commands;

use App\Models\Course;
use App\Models\Lesson;
use Illuminate\Console\Command;

/**
 * Seeds a single watchable module/lesson on PMP® Live Training Full Program
 * so Bunny Stream can be tested from /my-courses.
 *
 *   php artisan fix:pmp-course
 */
class FixPmpCourseCommand extends Command
{
    private const COURSE_SLUG = 'pmp-live-training';

    private const MODULE_NAME = 'Module 1: PMP Overview';

    private const LESSON_TITLE = 'Lesson 1: Introduction to PMP';

    private const BUNNY_VIDEO_ID = '4ae24953-6c34-4080-906e-b62ab1a8f6ab';

    protected $signature = 'fix:pmp-course';

    protected $description = 'Add one module/lesson with Bunny Stream video to PMP Live Training';

    public function handle(): int
    {
        $course = Course::query()
            ->where('slug', self::COURSE_SLUG)
            ->orWhere('title', 'like', '%PMP%Live Training Full Program%')
            ->orderByRaw("CASE WHEN slug = 'pmp-live-training' THEN 0 ELSE 1 END")
            ->first();

        if (! $course) {
            $this->error('PMP® Live Training Full Program not found. Run PublicCatalogSeeder first.');

            return self::FAILURE;
        }

        $lesson = Lesson::query()->updateOrCreate(
            [
                'course_id' => $course->id,
                'title' => self::LESSON_TITLE,
            ],
            [
                'module_name' => self::MODULE_NAME,
                'bunny_video_id' => self::BUNNY_VIDEO_ID,
                'video_url' => null,
                'duration' => 600,
                'pdf_resource_urls' => [],
                'is_locked' => false,
                'sort_order' => 1,
            ]
        );

        $this->info(sprintf(
            'Course #%d (%s) → lesson #%d "%s" with bunny_video_id=%s',
            $course->id,
            $course->slug,
            $lesson->id,
            $lesson->title,
            $lesson->bunny_video_id
        ));
        $this->line('Lessons on course: '.$course->lessons()->count());

        return self::SUCCESS;
    }
}
