<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseSchedule;
use App\Services\Schedules\ScheduleOccurrenceService;
use Illuminate\Http\JsonResponse;

/**
 * Lets checkout re-validate a batch that arrived in a deep link, without
 * refetching the whole course.
 */
class PublicScheduleController extends Controller
{
    public function __construct(private readonly ScheduleOccurrenceService $schedules) {}

    public function occurrence(Course $course, CourseSchedule $schedule, string $date): JsonResponse
    {
        abort_unless($course->is_published && $course->is_public, 404);

        // This route is outside the scope-bound admin group, so ownership and
        // visibility are checked by hand.
        abort_unless((int) $schedule->course_id === (int) $course->id, 404);
        abort_unless((bool) $schedule->is_active, 404);

        $occurrence = $this->schedules->findOccurrence($schedule, $date, $course);

        abort_if($occurrence === null || $occurrence->isCancelled(), 404);

        return response()->json(['data' => $occurrence->toArray()]);
    }
}
