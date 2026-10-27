<?php

namespace Tests\Unit;

use App\Models\Course;
use App\Models\CourseSchedule;
use App\Models\CourseScheduleException;
use App\Models\Order;
use App\Models\User;
use App\Services\Schedules\Occurrence;
use App\Services\Schedules\ScheduleOccurrenceService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScheduleOccurrenceServiceTest extends TestCase
{
    use RefreshDatabase;

    private ScheduleOccurrenceService $service;

    protected function setUp(): void
    {
        parent::setUp();

        // Status and horizon depend on "now", so the clock is frozen — every
        // date below is relative to 2030-01-01T00:00Z.
        $this->travelTo(CarbonImmutable::parse('2030-01-01 00:00:00', 'UTC'));

        $this->service = app(ScheduleOccurrenceService::class);
    }

    public function test_weekly_schedule_generates_the_selected_weekdays(): void
    {
        // 2030-01-07 is a Monday.
        $schedule = $this->schedule([
            'recurrence_type' => CourseSchedule::RECURRENCE_WEEKLY,
            'starts_on' => '2030-01-07',
            'weekdays' => [1, 3], // Monday + Wednesday
            'repeat_interval' => 1,
            'ends_type' => 'after_count',
            'max_occurrences' => 4,
        ]);

        $dates = $this->dates($schedule, '2030-01-01', '2030-03-01');

        $this->assertSame(['2030-01-07', '2030-01-09', '2030-01-14', '2030-01-16'], $dates);
    }

    public function test_weekly_interval_skips_weeks(): void
    {
        $schedule = $this->schedule([
            'recurrence_type' => CourseSchedule::RECURRENCE_WEEKLY,
            'starts_on' => '2030-01-07',
            'weekdays' => [1],
            'repeat_interval' => 2,
            'ends_type' => 'after_count',
            'max_occurrences' => 3,
        ]);

        $this->assertSame(
            ['2030-01-07', '2030-01-21', '2030-02-04'],
            $this->dates($schedule, '2030-01-01', '2030-06-01'),
        );
    }

    public function test_monthly_days_skips_months_without_the_day(): void
    {
        $schedule = $this->schedule([
            'recurrence_type' => CourseSchedule::RECURRENCE_MONTHLY_DAYS,
            'starts_on' => '2030-01-01',
            'month_days' => [31],
            'missing_day_policy' => 'skip',
            'ends_type' => 'on_date',
            'ends_on' => '2030-04-30',
        ]);

        // February and April have no 31st.
        $this->assertSame(['2030-01-31', '2030-03-31'], $this->dates($schedule, '2030-01-01', '2030-05-01'));
    }

    public function test_monthly_days_can_fall_back_to_the_last_day(): void
    {
        $schedule = $this->schedule([
            'recurrence_type' => CourseSchedule::RECURRENCE_MONTHLY_DAYS,
            'starts_on' => '2030-01-01',
            'month_days' => [31],
            'missing_day_policy' => 'last_day',
            'ends_type' => 'on_date',
            'ends_on' => '2030-04-30',
        ]);

        $this->assertSame(
            ['2030-01-31', '2030-02-28', '2030-03-31', '2030-04-30'],
            $this->dates($schedule, '2030-01-01', '2030-05-01'),
        );
    }

    public function test_custom_dates_can_repeat_monthly(): void
    {
        $schedule = $this->schedule([
            'recurrence_type' => CourseSchedule::RECURRENCE_CUSTOM_DATES,
            'starts_on' => '2030-01-01',
            'custom_dates' => ['2030-01-05', '2030-01-20'],
            'repeat_custom_monthly' => true,
            'ends_type' => 'after_count',
            'max_occurrences' => 4,
        ]);

        $this->assertSame(
            ['2030-01-05', '2030-01-20', '2030-02-05', '2030-02-20'],
            $this->dates($schedule, '2030-01-01', '2030-06-01'),
        );
    }

    public function test_after_count_counts_past_batches(): void
    {
        // 2029-12-03 is a Monday, before the frozen "now".
        $schedule = $this->schedule([
            'recurrence_type' => CourseSchedule::RECURRENCE_WEEKLY,
            'starts_on' => '2029-12-03',
            'weekdays' => [1],
            'ends_type' => 'after_count',
            'max_occurrences' => 3,
        ]);

        $this->assertSame(
            ['2029-12-03', '2029-12-10', '2029-12-17'],
            $this->dates($schedule, '2029-01-01', '2031-01-01'),
        );

        // The three allowed batches are used up, so nothing is still on sale.
        $this->assertCount(0, $this->service->upcomingForCourse($schedule->course));
    }

    public function test_start_and_end_are_converted_from_local_wall_time_to_utc(): void
    {
        $schedule = $this->schedule([
            'timezone' => 'Asia/Kuala_Lumpur', // UTC+8, no DST
            'start_time' => '09:00:00',
            'end_time' => '17:00:00',
            'duration_days' => 3,
            'starts_on' => '2030-05-10',
        ]);

        $occurrence = $this->service->findOccurrence($schedule, '2030-05-10');

        $this->assertNotNull($occurrence);
        $this->assertSame('2030-05-10T01:00:00Z', $occurrence->startAt->toIso8601ZuluString());
        $this->assertSame('2030-05-12T09:00:00Z', $occurrence->endAt->toIso8601ZuluString());
        $this->assertSame('2030-05-12', $occurrence->localEndDate);
        $this->assertSame('GMT+8', $occurrence->utcOffsetLabel);
    }

    public function test_dst_shift_keeps_the_local_start_time(): void
    {
        $schedule = $this->schedule([
            'timezone' => 'Europe/London',
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'recurrence_type' => CourseSchedule::RECURRENCE_CUSTOM_DATES,
            'starts_on' => '2030-01-01',
            'custom_dates' => ['2030-01-15', '2030-07-15'],
            'ends_type' => 'never',
        ]);

        $winter = $this->service->findOccurrence($schedule, '2030-01-15');
        $summer = $this->service->findOccurrence($schedule, '2030-07-15');

        // Same local 09:00, different UTC instants across the DST boundary.
        $this->assertSame('2030-01-15T09:00:00Z', $winter?->startAt->toIso8601ZuluString());
        $this->assertSame('2030-07-15T08:00:00Z', $summer?->startAt->toIso8601ZuluString());
        $this->assertSame('GMT', $winter?->utcOffsetLabel);
        $this->assertSame('GMT+1', $summer?->utcOffsetLabel);
    }

    public function test_seats_left_counts_only_paid_orders_for_that_date(): void
    {
        $schedule = $this->schedule([
            'starts_on' => '2030-06-10',
            'seats_total' => 10,
        ]);

        $this->order($schedule, '2030-06-10');
        $this->order($schedule, '2030-06-10');
        $this->order($schedule, '2030-06-10', paid: false);
        $this->order($schedule, '2030-07-10');

        $occurrence = $this->service->findOccurrence($schedule, '2030-06-10');

        $this->assertSame(10, $occurrence?->seatsTotal);
        $this->assertSame(8, $occurrence?->seatsLeft);
        $this->assertSame(Occurrence::STATUS_OPEN, $occurrence?->status);
    }

    public function test_a_full_batch_is_sold_out_and_not_bookable(): void
    {
        $schedule = $this->schedule(['starts_on' => '2030-06-10', 'seats_total' => 1]);
        $this->order($schedule, '2030-06-10');

        $occurrence = $this->service->findOccurrence($schedule, '2030-06-10');

        $this->assertSame(Occurrence::STATUS_SOLD_OUT, $occurrence?->status);
        $this->assertFalse($occurrence?->isBookable());
    }

    public function test_enrollment_cutoff_closes_the_batch(): void
    {
        $startsOn = CarbonImmutable::now('Asia/Kuala_Lumpur')->addDay();

        $schedule = $this->schedule([
            'starts_on' => $startsOn->format('Y-m-d'),
            'start_time' => $startsOn->format('H:i:s'),
            'end_time' => $startsOn->addHours(2)->format('H:i:s'),
            'enrollment_closes_hours' => 48,
        ]);

        $occurrence = $this->service->findOccurrence($schedule, $startsOn->format('Y-m-d'));

        $this->assertSame(Occurrence::STATUS_CLOSED, $occurrence?->status);
        $this->assertFalse($occurrence?->isBookable());
    }

    public function test_cancelled_exception_is_hidden_from_public_listings(): void
    {
        $schedule = $this->schedule([
            'recurrence_type' => CourseSchedule::RECURRENCE_CUSTOM_DATES,
            'starts_on' => '2030-01-01',
            'custom_dates' => ['2030-02-01', '2030-03-01'],
        ]);

        CourseScheduleException::query()->create([
            'course_schedule_id' => $schedule->id,
            'occurrence_date' => '2030-02-01',
            'status' => CourseScheduleException::STATUS_CANCELLED,
        ]);

        $upcoming = $this->service->upcomingForCourse($schedule->course);

        $this->assertSame(['2030-03-01'], $upcoming->map->occurrenceDate->all());
    }

    public function test_exception_overrides_time_and_price(): void
    {
        $schedule = $this->schedule(['starts_on' => '2030-06-10', 'price' => 900]);

        CourseScheduleException::query()->create([
            'course_schedule_id' => $schedule->id,
            'occurrence_date' => '2030-06-10',
            'status' => CourseScheduleException::STATUS_MODIFIED,
            'start_time' => '14:00:00',
            'price' => 500,
        ]);

        $occurrence = $this->service->findOccurrence($schedule, '2030-06-10');

        $this->assertSame('14:00', $occurrence?->startTime);
        $this->assertSame(500.0, $occurrence?->price);
        $this->assertTrue($occurrence?->isException);
    }

    public function test_price_falls_back_to_the_course_price(): void
    {
        $schedule = $this->schedule(['starts_on' => '2030-06-10', 'price' => null]);

        $occurrence = $this->service->findOccurrence($schedule, '2030-06-10');

        $this->assertSame(1200.0, $occurrence?->price);
    }

    public function test_a_date_the_rule_does_not_generate_is_rejected(): void
    {
        $schedule = $this->schedule(['starts_on' => '2030-06-10']);

        $this->assertNull($this->service->findOccurrence($schedule, '2030-06-11'));
    }

    public function test_upcoming_filters_by_delivery_mode(): void
    {
        $course = Course::factory()->create(['available_modes' => ['live', 'recorded']]);

        $this->schedule(['starts_on' => '2030-06-10', 'delivery_mode' => 'live'], $course);
        $this->schedule(['starts_on' => '2030-06-11', 'delivery_mode' => 'recorded'], $course);
        $this->schedule(['starts_on' => '2030-06-12', 'delivery_mode' => null], $course);

        $live = $this->service->upcomingForCourse($course->fresh(), 'live');

        // The mode-specific batch plus the "any mode" one.
        $this->assertSame(['2030-06-10', '2030-06-12'], $live->map->occurrenceDate->all());
    }

    public function test_inactive_schedules_are_not_listed(): void
    {
        $course = Course::factory()->create();
        $this->schedule(['starts_on' => '2030-06-10', 'is_active' => false], $course);

        $this->assertCount(0, $this->service->upcomingForCourse($course->fresh()));
    }

    public function test_a_weekly_rule_with_no_weekdays_generates_nothing(): void
    {
        $schedule = $this->schedule([
            'recurrence_type' => CourseSchedule::RECURRENCE_WEEKLY,
            'starts_on' => '2030-01-07',
            'weekdays' => [],
            'ends_type' => 'never',
        ]);

        $this->assertSame([], $this->dates($schedule, '2030-01-01', '2031-01-01'));
    }

    /* ─── Helpers ───────────────────────────────────────────────────────── */

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function schedule(array $attributes = [], ?Course $course = null): CourseSchedule
    {
        $course ??= Course::factory()->create();

        return CourseSchedule::factory()->create($attributes + ['course_id' => $course->id]);
    }

    /**
     * @return list<string>
     */
    private function dates(CourseSchedule $schedule, string $from, string $to): array
    {
        return $this->service->generate(
            $schedule,
            CarbonImmutable::parse($from, 'UTC'),
            CarbonImmutable::parse($to, 'UTC'),
            100,
        )->map->occurrenceDate->values()->all();
    }

    private function order(CourseSchedule $schedule, string $date, bool $paid = true): Order
    {
        $factory = Order::factory()->for(User::factory())->state([
            'course_id' => $schedule->course_id,
            'course_schedule_id' => $schedule->id,
            'schedule_occurrence_date' => $date,
        ]);

        return $paid ? $factory->create() : $factory->pending()->create();
    }
}
