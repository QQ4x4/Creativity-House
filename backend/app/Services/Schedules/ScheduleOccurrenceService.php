<?php

namespace App\Services\Schedules;

use App\Enums\PaymentStatus;
use App\Models\Course;
use App\Models\CourseSchedule;
use App\Models\CourseScheduleException;
use App\Models\Order;
use App\Services\Checkout\CheckoutService;
use App\Support\PublicMediaUrl;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Expands schedule rules into concrete batches.
 *
 * Deterministic and side-effect free: there is no cron on this deployment, so
 * every occurrence is generated on read and capped hard to keep `show()` cheap.
 */
class ScheduleOccurrenceService
{
    /** Never look further ahead than this, whatever the rule says. */
    private const MAX_HORIZON_MONTHS = 18;

    /** Hard stop per schedule per call — protects against runaway rules. */
    private const MAX_OCCURRENCES_PER_SCHEDULE = 200;

    /** Default public horizon. */
    private const PUBLIC_HORIZON_MONTHS = 12;

    public function __construct(private readonly CheckoutService $checkoutPricing) {}

    /**
     * Occurrences of one rule inside a UTC window.
     *
     * @param  array<string, int>|null  $seatCounts  Pre-aggregated "scheduleId|Y-m-d" => paid orders.
     * @return Collection<int, Occurrence>
     */
    public function generate(
        CourseSchedule $schedule,
        CarbonImmutable $fromUtc,
        CarbonImmutable $toUtc,
        int $limit = 50,
        ?Course $course = null,
        ?array $seatCounts = null,
        bool $includeCancelled = false,
    ): Collection {
        $course ??= $schedule->relationLoaded('course')
            ? $schedule->course
            : $schedule->course()->first();

        if ($course === null) {
            return collect();
        }

        $timezone = $this->safeTimezone($schedule->timezone);

        // Never expand further ahead than the horizon, whatever the caller asks.
        $horizon = CarbonImmutable::now('UTC')->addMonths(self::MAX_HORIZON_MONTHS);
        if ($toUtc->greaterThan($horizon)) {
            $toUtc = $horizon;
        }

        $toLocal = $toUtc->setTimezone($timezone)->endOfDay();

        $dates = $this->expandDates($schedule, $timezone, $toLocal);
        $exceptions = $this->exceptionsFor($schedule);
        $seatCounts ??= $this->seatCounts([$schedule->id]);

        $out = [];

        // Index is the position in the full series from starts_on (incl. past),
        // so batch numbers never shift when older dates fall out of the window.
        foreach (array_values($dates) as $seriesIndex => $date) {
            $occurrence = $this->buildOccurrence(
                $schedule,
                $course,
                $date,
                $timezone,
                $exceptions[$date] ?? null,
                $seatCounts,
                $seriesIndex,
            );

            if ($occurrence === null) {
                continue;
            }

            if (! $includeCancelled && $occurrence->isCancelled()) {
                continue;
            }

            // The window is evaluated on the batch end, so a running batch
            // stays visible until it is genuinely over.
            if ($occurrence->endAt->lessThan($fromUtc) || $occurrence->startAt->greaterThan($toUtc)) {
                continue;
            }

            $out[] = $occurrence;

            if (count($out) >= $limit) {
                break;
            }
        }

        return collect($out);
    }

    /**
     * Highest assigned batch number across every rule of the course (past +
     * upcoming within the expansion horizon), plus exception overrides.
     *
     * @return array{used: list<int>, suggested: int}
     */
    public function batchNumberStatsForCourse(Course $course): array
    {
        $schedules = ($course->relationLoaded('schedules')
            ? $course->schedules
            : $course->schedules()->with('exceptions')->get());

        $used = [];
        $now = CarbonImmutable::now('UTC');

        foreach ($schedules as $schedule) {
            $occurrences = $this->generate(
                $schedule,
                $now->subYears(5),
                $now->addMonths(self::MAX_HORIZON_MONTHS),
                self::MAX_OCCURRENCES_PER_SCHEDULE,
                $course,
                [],
                includeCancelled: true,
            );

            foreach ($occurrences as $occurrence) {
                if ($occurrence->batchNumber !== null) {
                    $used[(int) $occurrence->batchNumber] = true;
                }
            }
        }

        $numbers = array_map('intval', array_keys($used));
        sort($numbers);
        $max = $numbers === [] ? 0 : max($numbers);

        return [
            'used' => array_values($numbers),
            'suggested' => $max + 1,
        ];
    }

    /**
     * Every active rule of a course, merged and sorted by start.
     *
     * @return Collection<int, Occurrence>
     */
    public function upcomingForCourse(Course $course, ?string $mode = null, int $limit = 24): Collection
    {
        $schedules = ($course->relationLoaded('schedules')
            ? $course->schedules
            : $course->schedules()->get())
            ->filter(fn (CourseSchedule $schedule): bool => (bool) $schedule->is_active)
            ->when(
                $mode !== null && $mode !== '',
                fn (Collection $items) => $items->filter(
                    fn (CourseSchedule $schedule): bool => blank($schedule->delivery_mode)
                        || $schedule->delivery_mode === $mode
                )
            )
            ->values();

        if ($schedules->isEmpty()) {
            return collect();
        }

        $now = CarbonImmutable::now('UTC');
        $until = $now->addMonths(self::PUBLIC_HORIZON_MONTHS);

        // One aggregated query for every rule — never per occurrence.
        $seatCounts = $this->seatCounts($schedules->pluck('id')->all());

        return $schedules
            ->flatMap(fn (CourseSchedule $schedule) => $this->generate(
                $schedule,
                $now,
                $until,
                $limit,
                $course,
                $seatCounts,
            ))
            ->sortBy(fn (Occurrence $occurrence) => $occurrence->startAt->getTimestamp())
            ->values()
            ->take($limit);
    }

    /**
     * Validate that a date really belongs to a rule, for checkout.
     * Returns the occurrence even when it is closed or sold out — the caller
     * decides how to reject it.
     */
    public function findOccurrence(CourseSchedule $schedule, string $date, ?Course $course = null): ?Occurrence
    {
        $normalized = $this->normalizeDate($date);
        if ($normalized === null) {
            return null;
        }

        $course ??= $schedule->relationLoaded('course')
            ? $schedule->course
            : $schedule->course()->first();

        if ($course === null) {
            return null;
        }

        $timezone = $this->safeTimezone($schedule->timezone);

        // The requested date must be produced by the rule itself. Expansion
        // stops at that date, and the 200-occurrence slice bounds the cost.
        $target = CarbonImmutable::parse($normalized, $timezone)->endOfDay();
        $dates = array_values($this->expandDates($schedule, $timezone, $target));
        $seriesIndex = array_search($normalized, $dates, true);

        if ($seriesIndex === false) {
            return null;
        }

        return $this->buildOccurrence(
            $schedule,
            $course,
            $normalized,
            $timezone,
            $this->exceptionsFor($schedule)[$normalized] ?? null,
            $this->seatCounts([$schedule->id]),
            (int) $seriesIndex,
        );
    }

    /* ─── Date expansion ────────────────────────────────────────────────── */

    /**
     * Every start date the rule produces, from `starts_on` up to `$toLocal`.
     *
     * Generation always begins at `starts_on` (never at "today") because
     * `ends_type = after_count` counts past batches too — otherwise the series
     * would silently grow forever.
     *
     * @return list<string> Y-m-d, ascending and unique
     */
    private function expandDates(CourseSchedule $schedule, string $timezone, CarbonImmutable $toLocal): array
    {
        $startsOn = $this->startsOn($schedule, $timezone);
        if ($startsOn === null) {
            return [];
        }

        $limitDate = $toLocal;

        if ($schedule->ends_type === 'on_date' && filled($schedule->ends_on)) {
            $endsOn = CarbonImmutable::parse($schedule->ends_on->format('Y-m-d'), $timezone)->endOfDay();
            if ($endsOn->lessThan($limitDate)) {
                $limitDate = $endsOn;
            }
        }

        $maxCount = $schedule->ends_type === 'after_count'
            ? max(1, min((int) $schedule->max_occurrences, self::MAX_OCCURRENCES_PER_SCHEDULE))
            : self::MAX_OCCURRENCES_PER_SCHEDULE;

        $dates = match ($schedule->recurrence_type) {
            CourseSchedule::RECURRENCE_ONCE => [$startsOn->format('Y-m-d')],
            CourseSchedule::RECURRENCE_CUSTOM_DATES => $this->expandCustomDates($schedule, $timezone, $startsOn, $limitDate),
            CourseSchedule::RECURRENCE_WEEKLY => $this->expandWeekly($schedule, $startsOn, $limitDate),
            CourseSchedule::RECURRENCE_MONTHLY_DAYS => $this->expandMonthlyDays($schedule, $startsOn, $limitDate),
            default => [],
        };

        $dates = array_values(array_unique($dates));
        sort($dates);

        // after_count counts from the start of the series, including the past.
        $dates = array_slice($dates, 0, $maxCount);

        $limitString = $limitDate->format('Y-m-d');

        return array_values(array_filter(
            $dates,
            static fn (string $date): bool => $date <= $limitString
        ));
    }

    /**
     * @return list<string>
     */
    private function expandCustomDates(
        CourseSchedule $schedule,
        string $timezone,
        CarbonImmutable $startsOn,
        CarbonImmutable $limitDate,
    ): array {
        $selected = [];

        foreach ((array) ($schedule->custom_dates ?? []) as $raw) {
            $normalized = $this->normalizeDate($raw);
            if ($normalized !== null) {
                $selected[] = $normalized;
            }
        }

        $selected = array_values(array_unique($selected));
        sort($selected);

        if ($selected === []) {
            return [];
        }

        if (! $schedule->repeat_custom_monthly) {
            return $selected;
        }

        // Repeat the chosen day numbers every month, from the earliest month
        // that was picked.
        $dayNumbers = [];
        foreach ($selected as $date) {
            $dayNumbers[] = (int) substr($date, 8, 2);
        }
        $dayNumbers = array_values(array_unique($dayNumbers));
        sort($dayNumbers);

        $cursor = CarbonImmutable::parse($selected[0], $timezone)->startOfMonth();
        $startString = $startsOn->format('Y-m-d');
        $out = [];

        while ($cursor->lessThanOrEqualTo($limitDate) && count($out) < self::MAX_OCCURRENCES_PER_SCHEDULE) {
            foreach ($this->datesInMonth($cursor, $dayNumbers, (string) $schedule->missing_day_policy) as $date) {
                if ($date >= $startString) {
                    $out[] = $date;
                }
            }

            $cursor = $cursor->addMonthNoOverflow();
        }

        return $out;
    }

    /**
     * @return list<string>
     */
    private function expandWeekly(
        CourseSchedule $schedule,
        CarbonImmutable $startsOn,
        CarbonImmutable $limitDate,
    ): array {
        $weekdays = $this->intList($schedule->weekdays, 0, 6);

        // Empty weekdays would loop forever — validation blocks it, this is the
        // belt and braces.
        if ($weekdays === []) {
            return [];
        }

        $interval = max(1, (int) $schedule->repeat_interval);
        // Week containing starts_on, Sunday-based to match weekday 0 = Sunday.
        $weekStart = $startsOn->subDays((int) $startsOn->dayOfWeek);

        $out = [];
        $step = 0;
        $startString = $startsOn->format('Y-m-d');

        while (count($out) < self::MAX_OCCURRENCES_PER_SCHEDULE) {
            $base = $weekStart->addWeeks($step * $interval);

            if ($base->greaterThan($limitDate)) {
                break;
            }

            foreach ($weekdays as $weekday) {
                $date = $base->addDays($weekday)->format('Y-m-d');
                if ($date >= $startString && $date <= $limitDate->format('Y-m-d')) {
                    $out[] = $date;
                }
            }

            $step++;
        }

        return $out;
    }

    /**
     * @return list<string>
     */
    private function expandMonthlyDays(
        CourseSchedule $schedule,
        CarbonImmutable $startsOn,
        CarbonImmutable $limitDate,
    ): array {
        $monthDays = $this->intList($schedule->month_days, 1, 31);

        if ($monthDays === []) {
            return [];
        }

        $interval = max(1, (int) $schedule->repeat_interval);
        $policy = (string) $schedule->missing_day_policy;
        $cursor = $startsOn->startOfMonth();
        $startString = $startsOn->format('Y-m-d');

        $out = [];
        $step = 0;

        while (count($out) < self::MAX_OCCURRENCES_PER_SCHEDULE) {
            $month = $cursor->addMonthsNoOverflow($step * $interval);

            if ($month->greaterThan($limitDate)) {
                break;
            }

            foreach ($this->datesInMonth($month, $monthDays, $policy) as $date) {
                if ($date >= $startString && $date <= $limitDate->format('Y-m-d')) {
                    $out[] = $date;
                }
            }

            $step++;
        }

        return $out;
    }

    /**
     * Resolve day numbers inside one month, honouring the missing-day policy.
     * De-duplicated, so 30 + 31 with `last_day` in April yields one date.
     *
     * @param  list<int>  $dayNumbers
     * @return list<string>
     */
    private function datesInMonth(CarbonImmutable $month, array $dayNumbers, string $policy): array
    {
        $daysInMonth = (int) $month->daysInMonth;
        $out = [];

        foreach ($dayNumbers as $day) {
            if ($day <= $daysInMonth) {
                $out[] = $month->setDay($day)->format('Y-m-d');

                continue;
            }

            if ($policy === 'last_day') {
                $out[] = $month->setDay($daysInMonth)->format('Y-m-d');
            }
            // 'skip' → the month simply has no batch for that day number.
        }

        return array_values(array_unique($out));
    }

    /* ─── Occurrence assembly ───────────────────────────────────────────── */

    private function buildOccurrence(
        CourseSchedule $schedule,
        Course $course,
        string $date,
        string $timezone,
        ?CourseScheduleException $exception,
        array $seatCounts,
        int $seriesIndex = 0,
    ): ?Occurrence {
        $startTime = $exception?->start_time !== null
            ? $schedule->normalizeTime($exception->start_time)
            : $schedule->normalizedStartTime();

        $endTime = $exception?->end_time !== null
            ? $schedule->normalizeTime($exception->end_time)
            : $schedule->normalizedEndTime();

        $durationDays = max(1, (int) ($exception?->duration_days ?? $schedule->duration_days ?? 1));

        // Build the local wall time first, then convert — this is what keeps
        // the result correct across DST boundaries.
        $startLocal = CarbonImmutable::parse("{$date} {$startTime}", $timezone);
        $endLocalDate = CarbonImmutable::parse($date, $timezone)->addDays($durationDays - 1);
        $endLocal = CarbonImmutable::parse("{$endLocalDate->format('Y-m-d')} {$endTime}", $timezone);

        if ($endLocal->lessThan($startLocal)) {
            // Overnight single-day batch (e.g. 22:00 → 02:00).
            $endLocal = $endLocal->addDay();
        }

        $startAt = $startLocal->utc();
        $endAt = $endLocal->utc();

        $mode = $schedule->delivery_mode
            ?: $this->checkoutPricing->resolveMode($course, null);

        $price = $this->resolvePrice($schedule, $exception, $course, $mode);
        $originalPrice = $exception?->original_price !== null
            ? (float) $exception->original_price
            : ($schedule->original_price !== null ? (float) $schedule->original_price : null);

        $discountPercent = ($originalPrice !== null && $originalPrice > $price && $originalPrice > 0)
            ? (int) round((1 - ($price / $originalPrice)) * 100)
            : null;

        $seatsTotal = $exception?->seats_total ?? $schedule->seats_total;
        $seatsTotal = $seatsTotal !== null ? (int) $seatsTotal : null;
        $seatsTaken = (int) ($seatCounts["{$schedule->id}|{$date}"] ?? 0);
        $seatsLeft = $seatsTotal !== null ? max(0, $seatsTotal - $seatsTaken) : null;

        $status = $this->resolveStatus($schedule, $exception, $startAt, $endAt, $seatsTotal, $seatsLeft);

        $batchNumberOverride = $exception?->batch_number !== null
            ? (int) $exception->batch_number
            : null;
        $batchNumber = $batchNumberOverride;
        if ($batchNumber === null && $schedule->batch_number !== null) {
            $batchNumber = (int) $schedule->batch_number + $seriesIndex;
        }

        return new Occurrence(
            scheduleId: (int) $schedule->id,
            occurrenceDate: $date,
            startAt: $startAt,
            endAt: $endAt,
            timezone: $timezone,
            utcOffsetLabel: $this->offsetLabel($startLocal),
            localStartDate: $date,
            localEndDate: $endLocalDate->format('Y-m-d'),
            startTime: substr($startTime, 0, 5),
            endTime: substr($endTime, 0, 5),
            durationDays: $durationDays,
            timeSlot: $schedule->resolveTimeSlot(),
            format: (string) ($schedule->format ?: 'online'),
            locationEn: $schedule->location_en,
            locationAr: $schedule->location_ar,
            batchNumber: $batchNumber,
            batchNumberOverride: $batchNumberOverride,
            titleEn: $schedule->title_en,
            titleAr: $schedule->title_ar,
            deliveryMode: $schedule->delivery_mode,
            price: $price,
            originalPrice: $originalPrice,
            currency: strtoupper((string) ($course->currency ?: 'USD')),
            discountPercent: $discountPercent,
            promoTextEn: $schedule->promo_text_en,
            promoTextAr: $schedule->promo_text_ar,
            seatsTotal: $seatsTotal,
            seatsLeft: $seatsLeft,
            seatsTaken: $seatsTaken,
            showSeatsLeft: (bool) $schedule->show_seats_left,
            status: $status,
            ctaType: (string) ($schedule->cta_type ?: 'enroll'),
            showCountdown: (bool) $schedule->show_countdown,
            isFeatured: (bool) $schedule->is_featured,
            trainer: [
                'name_en' => $exception?->trainer_name_en ?: ($schedule->trainer_name_en ?: $course->instructor_name),
                'name_ar' => $exception?->trainer_name_ar ?: ($schedule->trainer_name_ar ?: $course->instructor_name_ar),
                'title_en' => $schedule->trainer_title_en ?: $course->instructor_title_en,
                'title_ar' => $schedule->trainer_title_ar ?: $course->instructor_title_ar,
                'photo' => PublicMediaUrl::resolve(
                    $exception?->trainer_photo ?: ($schedule->trainer_photo ?: $course->instructor_photo)
                ),
            ],
            trainerOverride: $exception !== null
                ? [
                    'name_en' => $exception->trainer_name_en,
                    'name_ar' => $exception->trainer_name_ar,
                    'photo' => PublicMediaUrl::resolve($exception->trainer_photo),
                ]
                : null,
            noteEn: $exception?->note_en ?: $schedule->notes_en,
            noteAr: $exception?->note_ar ?: $schedule->notes_ar,
            isException: $exception !== null,
        );
    }

    /**
     * Exception price → schedule price → the same resolver checkout uses.
     */
    private function resolvePrice(
        CourseSchedule $schedule,
        ?CourseScheduleException $exception,
        Course $course,
        string $mode,
    ): float {
        if ($exception?->price !== null) {
            return round((float) $exception->price, 2);
        }

        if ($schedule->price !== null) {
            return round((float) $schedule->price, 2);
        }

        return $this->checkoutPricing->resolveAmount($course, $mode);
    }

    private function resolveStatus(
        CourseSchedule $schedule,
        ?CourseScheduleException $exception,
        CarbonImmutable $startAt,
        CarbonImmutable $endAt,
        ?int $seatsTotal,
        ?int $seatsLeft,
    ): string {
        if ($exception?->status === CourseScheduleException::STATUS_CANCELLED) {
            return Occurrence::STATUS_CANCELLED;
        }

        $now = CarbonImmutable::now('UTC');

        if ($now->greaterThanOrEqualTo($endAt)) {
            return Occurrence::STATUS_ENDED;
        }

        if ($now->greaterThanOrEqualTo($startAt)) {
            return Occurrence::STATUS_STARTED;
        }

        if ($exception?->status === CourseScheduleException::STATUS_SOLD_OUT) {
            return Occurrence::STATUS_SOLD_OUT;
        }

        if ($seatsLeft !== null && $seatsLeft <= 0) {
            return Occurrence::STATUS_SOLD_OUT;
        }

        $closesHours = max(0, (int) $schedule->enrollment_closes_hours);
        if ($now->greaterThanOrEqualTo($startAt->subHours($closesHours))) {
            return Occurrence::STATUS_CLOSED;
        }

        if ($seatsLeft !== null && $seatsTotal !== null && $seatsTotal > 0) {
            if ($seatsLeft <= 3 || $seatsLeft <= (int) ceil($seatsTotal * 0.2)) {
                return Occurrence::STATUS_FEW_SEATS;
            }
        }

        return Occurrence::STATUS_OPEN;
    }

    /* ─── Shared helpers ────────────────────────────────────────────────── */

    /**
     * Paid seats per (schedule, date) in a single grouped query.
     *
     * @param  list<int>  $scheduleIds
     * @return array<string, int>
     */
    public function seatCounts(array $scheduleIds): array
    {
        $scheduleIds = array_values(array_filter(array_map('intval', $scheduleIds)));

        if ($scheduleIds === []) {
            return [];
        }

        $rows = Order::query()
            ->whereIn('course_schedule_id', $scheduleIds)
            ->whereNotNull('schedule_occurrence_date')
            ->where('payment_status', PaymentStatus::Paid->value)
            ->groupBy('course_schedule_id', 'schedule_occurrence_date')
            ->selectRaw('course_schedule_id, schedule_occurrence_date, COUNT(*) as seats_taken')
            ->get();

        $out = [];

        foreach ($rows as $row) {
            $date = substr((string) $row->schedule_occurrence_date, 0, 10);
            $out["{$row->course_schedule_id}|{$date}"] = (int) $row->seats_taken;
        }

        return $out;
    }

    /**
     * @return array<string, CourseScheduleException>
     */
    private function exceptionsFor(CourseSchedule $schedule): array
    {
        $exceptions = $schedule->relationLoaded('exceptions')
            ? $schedule->exceptions
            : $schedule->exceptions()->get();

        $out = [];

        foreach ($exceptions as $exception) {
            $out[$exception->occurrence_date] = $exception;
        }

        return $out;
    }

    private function startsOn(CourseSchedule $schedule, string $timezone): ?CarbonImmutable
    {
        if (blank($schedule->starts_on)) {
            return null;
        }

        return CarbonImmutable::parse($schedule->starts_on->format('Y-m-d'), $timezone)->startOfDay();
    }

    /**
     * "GMT+8", "GMT+5:30", "GMT" — evaluated at the occurrence, so DST shows.
     */
    private function offsetLabel(CarbonImmutable $localStart): string
    {
        $minutes = (int) ($localStart->getOffset() / 60);

        if ($minutes === 0) {
            return 'GMT';
        }

        $sign = $minutes < 0 ? '-' : '+';
        $minutes = abs($minutes);
        $hours = intdiv($minutes, 60);
        $rest = $minutes % 60;

        return $rest === 0
            ? sprintf('GMT%s%d', $sign, $hours)
            : sprintf('GMT%s%d:%02d', $sign, $hours, $rest);
    }

    private function safeTimezone(?string $timezone): string
    {
        $candidate = trim((string) $timezone);

        if ($candidate === '' || ! in_array($candidate, timezone_identifiers_list(), true)) {
            return 'UTC';
        }

        return $candidate;
    }

    private function normalizeDate(mixed $value): ?string
    {
        $text = trim((string) $value);

        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $text, $match) !== 1) {
            return null;
        }

        if (! checkdate((int) $match[2], (int) $match[3], (int) $match[1])) {
            return null;
        }

        return "{$match[1]}-{$match[2]}-{$match[3]}";
    }

    /**
     * @return list<int>
     */
    private function intList(mixed $value, int $min, int $max): array
    {
        if (! is_array($value)) {
            return [];
        }

        $out = [];

        foreach ($value as $item) {
            if (! is_numeric($item)) {
                continue;
            }

            $int = (int) $item;
            if ($int >= $min && $int <= $max) {
                $out[] = $int;
            }
        }

        $out = array_values(array_unique($out));
        sort($out);

        return $out;
    }
}
