<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PreviewCourseScheduleRequest;
use App\Http\Requests\Admin\SaveCourseScheduleRequest;
use App\Http\Resources\Admin\AdminCourseScheduleResource;
use App\Models\Course;
use App\Models\CourseSchedule;
use App\Services\Schedules\Occurrence;
use App\Services\Schedules\ScheduleOccurrenceService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

/**
 * Batch rules for one course. Routes are registered inside the admin group,
 * which is scope-bound, so a schedule belonging to another course 404s.
 */
class CourseScheduleController extends Controller
{
    public function __construct(private readonly ScheduleOccurrenceService $occurrences) {}

    public function index(Course $course): JsonResponse
    {
        $schedules = $course->schedules()->with('exceptions')->get();
        $now = CarbonImmutable::now('UTC');

        $data = $schedules->map(function (CourseSchedule $schedule) use ($course, $now): array {
            $occurrences = $this->occurrences->generate(
                $schedule,
                $now,
                $now->addMonths(18),
                3,
                $course,
                null,
                includeCancelled: true,
            );

            $payload = AdminCourseScheduleResource::make($schedule)->resolve();
            $payload['next_occurrences'] = $occurrences
                ->map(fn (Occurrence $occurrence) => $occurrence->toAdminArray())
                ->values()
                ->all();
            $payload['seats_sold'] = (int) $occurrences->sum(fn (Occurrence $o) => $o->seatsTaken);

            return $payload;
        })->values();

        $stats = $this->occurrences->batchNumberStatsForCourse($course);

        return response()->json([
            'data' => $data,
            'meta' => [
                'suggested_batch_number' => $stats['suggested'],
                'used_batch_numbers' => $stats['used'],
            ],
        ]);
    }

    public function store(SaveCourseScheduleRequest $request, Course $course): JsonResponse
    {
        $schedule = $course->schedules()->create($request->scheduleAttributes());

        return AdminCourseScheduleResource::make($schedule->load('exceptions'))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Course $course, CourseSchedule $schedule): AdminCourseScheduleResource
    {
        return AdminCourseScheduleResource::make($schedule->load('exceptions'));
    }

    public function update(
        SaveCourseScheduleRequest $request,
        Course $course,
        CourseSchedule $schedule,
    ): AdminCourseScheduleResource {
        $schedule->update($request->scheduleAttributes());

        return AdminCourseScheduleResource::make($schedule->fresh()->load('exceptions'));
    }

    public function destroy(Course $course, CourseSchedule $schedule): Response
    {
        // Soft delete — paid orders keep pointing at the row until it is purged.
        $schedule->delete();

        return response()->noContent();
    }

    /**
     * Copy a rule, including its per-date exceptions, as an inactive draft.
     */
    public function duplicate(Course $course, CourseSchedule $schedule): JsonResponse
    {
        $copy = DB::transaction(function () use ($schedule): CourseSchedule {
            $copy = $schedule->replicate(['deleted_at']);
            $copy->is_active = false;
            $copy->is_featured = false;
            $copy->title_en = filled($schedule->title_en) ? $schedule->title_en.' (copy)' : null;
            $copy->title_ar = $schedule->title_ar;
            $copy->sort_order = (int) $schedule->sort_order + 1;
            $copy->save();

            foreach ($schedule->exceptions as $exception) {
                $exceptionCopy = $exception->replicate();
                $exceptionCopy->course_schedule_id = $copy->id;
                $exceptionCopy->save();
            }

            return $copy;
        });

        return AdminCourseScheduleResource::make($copy->load('exceptions'))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Dates an unsaved rule would generate. Nothing is persisted.
     */
    public function preview(PreviewCourseScheduleRequest $request, Course $course): JsonResponse
    {
        $draft = new CourseSchedule($request->scheduleAttributes());
        $draft->course_id = $course->id;
        // The draft has no id, so it can have neither exceptions nor orders.
        $draft->setRelation('exceptions', collect());

        $now = CarbonImmutable::now('UTC');
        $limit = $request->previewLimit();

        $occurrences = $this->occurrences->generate(
            $draft,
            $now->subYears(5),
            $now->addMonths(18),
            $limit,
            $course,
            [],
        );

        return response()->json([
            'data' => $occurrences->map(fn (Occurrence $occurrence) => $occurrence->toAdminArray())->values(),
        ]);
    }

    /**
     * Generated batches of a saved rule, including cancelled ones so the admin
     * can undo a cancellation.
     */
    public function occurrences(Request $request, Course $course, CourseSchedule $schedule): JsonResponse
    {
        $limit = (int) $request->integer('limit', 50);
        $limit = max(1, min($limit, 200));

        $now = CarbonImmutable::now('UTC');
        $includePast = $request->boolean('include_past');

        $occurrences = $this->occurrences->generate(
            $schedule,
            $includePast ? $now->subYears(5) : $now,
            $now->addMonths(18),
            $limit,
            $course,
            null,
            includeCancelled: true,
        );

        return response()->json([
            'data' => $occurrences->map(fn (Occurrence $occurrence) => $occurrence->toAdminArray())->values(),
        ]);
    }
}
