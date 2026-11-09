<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PreviewCourseScheduleRequest;
use App\Http\Requests\Admin\SaveCourseScheduleRequest;
use App\Http\Resources\Admin\AdminCourseScheduleResource;
use App\Models\Course;
use App\Models\CourseSchedule;
use App\Models\CourseScheduleSession;
use App\Services\Schedules\Occurrence;
use App\Services\Schedules\ScheduleOccurrenceService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Batch rules for one course. Routes are registered inside the admin group,
 * which is scope-bound, so a schedule belonging to another course 404s.
 */
class CourseScheduleController extends Controller
{
    public function __construct(private readonly ScheduleOccurrenceService $occurrences) {}

    public function index(Course $course): JsonResponse
    {
        $schedules = $course->schedules()->with(['exceptions', 'sessions'])->get();
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
            $payload['session_count'] = $schedule->isCohort()
                ? $schedule->sessions->count()
                : null;
            $payload['lifecycle_status'] = $this->lifecycleStatus($schedule, $occurrences->first());

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
        $schedule = DB::transaction(function () use ($request, $course): CourseSchedule {
            $schedule = $course->schedules()->create($request->scheduleAttributes());
            $this->syncSessions($schedule, $request->sessionAttributes());

            return $schedule;
        });

        return AdminCourseScheduleResource::make($schedule->load(['exceptions', 'sessions']))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Course $course, CourseSchedule $schedule): AdminCourseScheduleResource
    {
        return AdminCourseScheduleResource::make($schedule->load(['exceptions', 'sessions']));
    }

    public function update(
        SaveCourseScheduleRequest $request,
        Course $course,
        CourseSchedule $schedule,
    ): AdminCourseScheduleResource {
        DB::transaction(function () use ($request, $schedule): void {
            $schedule->update($request->scheduleAttributes());
            $this->syncSessions($schedule, $request->sessionAttributes());
        });

        return AdminCourseScheduleResource::make($schedule->fresh()->load(['exceptions', 'sessions']));
    }

    public function destroy(Course $course, CourseSchedule $schedule): Response
    {
        // Soft delete — paid orders keep pointing at the row until it is purged.
        $schedule->delete();

        return response()->noContent();
    }

    /**
     * Copy a rule, including its per-date exceptions and cohort sessions, as an inactive draft.
     * Optional `weeks_shift` (cohort) moves every session forward by N weeks and assigns
     * the next free batch number.
     */
    public function duplicate(Request $request, Course $course, CourseSchedule $schedule): JsonResponse
    {
        $schedule->loadMissing(['exceptions', 'sessions']);
        $weeksShift = max(0, (int) $request->integer('weeks_shift', 0));

        if ($weeksShift > 104) {
            throw ValidationException::withMessages([
                'weeks_shift' => 'Shift at most 104 weeks.',
            ]);
        }

        $stats = $this->occurrences->batchNumberStatsForCourse($course);

        $copy = DB::transaction(function () use ($schedule, $weeksShift, $stats): CourseSchedule {
            $copy = $schedule->replicate(['deleted_at']);
            $copy->is_active = false;
            $copy->is_featured = false;
            $copy->title_en = filled($schedule->title_en) ? $schedule->title_en.' (copy)' : null;
            $copy->title_ar = $schedule->title_ar;
            $copy->sort_order = (int) $schedule->sort_order + 1;

            if ($schedule->isCohort()) {
                $copy->batch_number = (int) $stats['suggested'];
            }

            $copy->save();

            foreach ($schedule->exceptions as $exception) {
                $exceptionCopy = $exception->replicate();
                $exceptionCopy->course_schedule_id = $copy->id;
                if ($weeksShift > 0 && filled($exception->occurrence_date)) {
                    $exceptionCopy->occurrence_date = CarbonImmutable::parse(
                        $exception->occurrence_date instanceof \DateTimeInterface
                            ? $exception->occurrence_date->format('Y-m-d')
                            : (string) $exception->occurrence_date
                    )->addWeeks($weeksShift)->format('Y-m-d');
                }
                $exceptionCopy->save();
            }

            $shiftedDates = [];
            foreach ($schedule->sessions as $session) {
                $sessionCopy = $session->replicate();
                $sessionCopy->course_schedule_id = $copy->id;
                if ($weeksShift > 0) {
                    $base = $session->date instanceof \DateTimeInterface
                        ? $session->date->format('Y-m-d')
                        : substr((string) $session->date, 0, 10);
                    $sessionCopy->date = CarbonImmutable::parse($base)->addWeeks($weeksShift)->format('Y-m-d');
                }
                $sessionCopy->save();
                $shiftedDates[] = $sessionCopy->date instanceof \DateTimeInterface
                    ? $sessionCopy->date->format('Y-m-d')
                    : substr((string) $sessionCopy->date, 0, 10);
            }

            if ($schedule->isCohort() && $shiftedDates !== []) {
                sort($shiftedDates);
                $copy->starts_on = $shiftedDates[0];
                $copy->custom_dates = $shiftedDates;
                $copy->enrollment_closes_at = count($shiftedDates) >= 2
                    ? $shiftedDates[1]
                    : $copy->enrollment_closes_at;
                $copy->duration_days = max(
                    1,
                    (int) CarbonImmutable::parse($shiftedDates[0])
                        ->diffInDays(CarbonImmutable::parse($shiftedDates[count($shiftedDates) - 1])) + 1
                );
                $copy->save();
            } elseif ($weeksShift > 0 && filled($copy->starts_on)) {
                $copy->starts_on = CarbonImmutable::parse(
                    $copy->starts_on instanceof \DateTimeInterface
                        ? $copy->starts_on->format('Y-m-d')
                        : (string) $copy->starts_on
                )->addWeeks($weeksShift)->format('Y-m-d');
                if (is_array($copy->custom_dates)) {
                    $copy->custom_dates = array_values(array_map(
                        static fn ($date) => CarbonImmutable::parse(substr((string) $date, 0, 10))
                            ->addWeeks($weeksShift)
                            ->format('Y-m-d'),
                        $copy->custom_dates
                    ));
                }
                $copy->save();
            }

            return $copy;
        });

        return AdminCourseScheduleResource::make($copy->load(['exceptions', 'sessions']))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * @param  Occurrence|null  $first
     */
    private function lifecycleStatus(CourseSchedule $schedule, ?Occurrence $first): string
    {
        if (! $schedule->is_active) {
            return 'inactive';
        }

        if ($first === null) {
            return 'open';
        }

        return match ($first->status) {
            Occurrence::STATUS_ENDED => 'completed',
            Occurrence::STATUS_STARTED => 'in_progress',
            Occurrence::STATUS_CLOSED => 'enrollment_closed',
            Occurrence::STATUS_SOLD_OUT => 'enrollment_closed',
            Occurrence::STATUS_CANCELLED => 'inactive',
            default => 'open',
        };
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

        $sessionModels = collect($request->sessionAttributes())->map(
            function (array $row): CourseScheduleSession {
                $session = new CourseScheduleSession($row);
                $session->date = $row['date'];

                return $session;
            }
        );
        $draft->setRelation('sessions', $sessionModels);

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

        $schedule->loadMissing('sessions');

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

    /**
     * @param  list<array<string, mixed>>  $sessions
     */
    private function syncSessions(CourseSchedule $schedule, array $sessions): void
    {
        $schedule->sessions()->delete();

        if (($schedule->type ?: CourseSchedule::TYPE_SEPARATE) !== CourseSchedule::TYPE_COHORT) {
            return;
        }

        foreach ($sessions as $row) {
            $schedule->sessions()->create($row);
        }
    }
}
