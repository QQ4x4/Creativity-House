<?php

namespace App\Console\Commands;

use App\Models\Lesson;
use Illuminate\Console\Command;

/**
 * Assigns a Bunny Stream video GUID to a specific lesson without touching
 * enrollments, orders, or other lesson fields.
 *
 * Default target: "Estimating time and cost realistically"
 * under Module 2: Planning & Scope (StudentPortalSeeder / PM Foundations).
 */
class AssignBunnyVideoId extends Command
{
    protected $signature = 'lessons:assign-bunny-video
                            {--title=Estimating time and cost realistically : Lesson title to update}
                            {--module=Module 2: Planning & Scope : Module name filter}
                            {--video-id=4ae24953-6c34-4080-906e-b62ab1a8f6ab : Bunny Stream video GUID}';

    protected $description = 'Assign a Bunny Stream video ID to a lesson (safe; does not wipe enrollments)';

    public function handle(): int
    {
        $title = (string) $this->option('title');
        $module = (string) $this->option('module');
        $videoId = (string) $this->option('video-id');

        if ($videoId === '') {
            $this->error('A Bunny video ID is required (--video-id).');

            return self::FAILURE;
        }

        $query = Lesson::query()->where('title', $title);

        if ($module !== '') {
            $query->where('module_name', $module);
        }

        $lessons = $query->get();

        if ($lessons->isEmpty()) {
            $this->error(sprintf(
                'No lesson found for title "%s"%s.',
                $title,
                $module !== '' ? ' in module "'.$module.'"' : ''
            ));

            return self::FAILURE;
        }

        $updated = 0;

        foreach ($lessons as $lesson) {
            $lesson->forceFill(['bunny_video_id' => $videoId])->save();
            $updated++;

            $this->info(sprintf(
                'Updated lesson #%d (%s) → bunny_video_id=%s',
                $lesson->id,
                $lesson->title,
                $videoId
            ));
        }

        $this->info("Done. {$updated} lesson(s) updated. Orders and enrollments were not modified.");

        return self::SUCCESS;
    }
}
