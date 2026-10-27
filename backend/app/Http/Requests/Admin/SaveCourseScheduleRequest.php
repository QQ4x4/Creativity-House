<?php

namespace App\Http\Requests\Admin;

use App\Models\CourseSchedule;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Shared by store, update and preview — the admin editor always submits the
 * whole batch rule, so PUT is a full replacement and needs identical rules.
 */
class SaveCourseScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    protected function prepareForValidation(): void
    {
        // Blank selects arrive as "" from the admin form; treat them as "unset"
        // so nullable/in rules don't fire on an empty string.
        foreach ([
            'delivery_mode',
            'time_slot',
            'ends_on',
            'price',
            'original_price',
            'seats_total',
            'max_occurrences',
            'batch_number',
            'trainer_name_en',
            'trainer_name_ar',
            'trainer_title_en',
            'trainer_title_ar',
            'trainer_photo',
        ] as $key) {
            if ($this->input($key) === '') {
                $this->merge([$key => null]);
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $medium = config('field_limits.medium');
        $long = config('field_limits.long');
        $url = config('field_limits.url');

        return [
            // null = available for every delivery mode of the course.
            'delivery_mode' => ['nullable', 'string', Rule::in(['live', 'recorded', 'simulator'])],

            'title_en' => ['nullable', 'string', 'max:'.$medium],
            'title_ar' => ['nullable', 'string', 'max:'.$medium],
            // Legacy label columns remain in the DB but are no longer accepted.
            'batch_number' => ['nullable', 'integer', 'min:1'],

            'time_slot' => ['nullable', Rule::in(CourseSchedule::TIME_SLOTS)],
            'format' => ['required', Rule::in(CourseSchedule::FORMATS)],
            'location_en' => ['nullable', 'string', 'max:'.$medium],
            'location_ar' => ['nullable', 'string', 'max:'.$medium],

            'timezone' => ['required', 'string', 'timezone:all'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i'],
            'duration_days' => ['required', 'integer', 'between:1,365'],

            'recurrence_type' => ['required', Rule::in(CourseSchedule::RECURRENCE_TYPES)],
            'starts_on' => ['required', 'date_format:Y-m-d'],

            'custom_dates' => [
                Rule::requiredIf(fn (): bool => $this->input('recurrence_type') === CourseSchedule::RECURRENCE_CUSTOM_DATES),
                'nullable', 'array', 'max:120',
            ],
            'custom_dates.*' => ['date_format:Y-m-d'],
            'repeat_custom_monthly' => ['boolean'],

            'weekdays' => [
                Rule::requiredIf(fn (): bool => $this->input('recurrence_type') === CourseSchedule::RECURRENCE_WEEKLY),
                'nullable', 'array', 'max:7',
            ],
            'weekdays.*' => ['integer', 'between:0,6'],

            'repeat_interval' => ['nullable', 'integer', 'between:1,12'],

            'month_days' => [
                Rule::requiredIf(fn (): bool => $this->input('recurrence_type') === CourseSchedule::RECURRENCE_MONTHLY_DAYS),
                'nullable', 'array', 'max:31',
            ],
            'month_days.*' => ['integer', 'between:1,31'],
            'missing_day_policy' => ['nullable', Rule::in(CourseSchedule::MISSING_DAY_POLICIES)],

            'ends_type' => ['required', Rule::in(CourseSchedule::ENDS_TYPES)],
            'ends_on' => [
                Rule::requiredIf(fn (): bool => $this->input('ends_type') === 'on_date'),
                'nullable', 'date_format:Y-m-d', 'after_or_equal:starts_on',
            ],
            'max_occurrences' => [
                Rule::requiredIf(fn (): bool => $this->input('ends_type') === 'after_count'),
                'nullable', 'integer', 'between:1,200',
            ],

            'price' => ['nullable', 'numeric', 'between:0,99999999.99'],
            'original_price' => ['nullable', 'numeric', 'between:0,99999999.99', 'gte:price'],
            'promo_text_en' => ['nullable', 'string', 'max:'.$medium],
            'promo_text_ar' => ['nullable', 'string', 'max:'.$medium],

            'seats_total' => ['nullable', 'integer', 'between:1,100000'],
            'show_seats_left' => ['boolean'],
            'enrollment_closes_hours' => ['nullable', 'integer', 'between:0,8760'],

            'cta_type' => ['nullable', Rule::in(CourseSchedule::CTA_TYPES)],

            'trainer_name_en' => ['nullable', 'string', 'max:'.$medium],
            'trainer_name_ar' => ['nullable', 'string', 'max:'.$medium],
            'trainer_title_en' => ['nullable', 'string', 'max:'.$medium],
            'trainer_title_ar' => ['nullable', 'string', 'max:'.$medium],
            'trainer_photo' => ['nullable', 'string', 'max:'.$url],

            'show_countdown' => ['boolean'],
            'is_featured' => ['boolean'],
            'is_active' => ['boolean'],
            'notes_en' => ['nullable', 'string', 'max:'.$long],
            'notes_ar' => ['nullable', 'string', 'max:'.$long],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'weekdays.required' => 'Select at least one weekday for a weekly schedule.',
            'month_days.required' => 'Select at least one day of the month.',
            'custom_dates.required' => 'Select at least one date.',
            'max_occurrences.required' => 'Set how many batches to generate.',
            'ends_on.required' => 'Set the date the schedule stops repeating.',
            'original_price.gte' => 'The original price must be greater than or equal to the price.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        // Live preview may draft any dates — persistence rules apply to store/update only.
        if ($this instanceof PreviewCourseScheduleRequest) {
            return;
        }

        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $timezone = (string) $this->input('timezone', 'UTC');
            try {
                $now = CarbonImmutable::now($timezone);
            } catch (\Throwable) {
                $now = CarbonImmutable::now('UTC');
                $timezone = 'UTC';
            }

            $today = $now->startOfDay();
            $startsOnRaw = (string) $this->input('starts_on');
            $startsOn = CarbonImmutable::parse($startsOnRaw, $timezone)->startOfDay();

            /** @var CourseSchedule|null $existing */
            $existing = $this->route('schedule');
            $isUpdate = $existing instanceof CourseSchedule;
            $existingStartsOn = $isUpdate
                ? CarbonImmutable::parse(
                    $existing->starts_on instanceof \DateTimeInterface
                        ? $existing->starts_on->format('Y-m-d')
                        : (string) $existing->starts_on,
                    $timezone
                )->startOfDay()
                : null;

            $startsOnUnchanged = $isUpdate
                && $existingStartsOn !== null
                && $existingStartsOn->equalTo($startsOn);

            if (! $startsOnUnchanged && $startsOn->lt($today)) {
                $validator->errors()->add(
                    'starts_on',
                    'The start date cannot be in the past (schedule timezone).'
                );
            }

            if ($this->input('recurrence_type') === CourseSchedule::RECURRENCE_CUSTOM_DATES) {
                $existingCustom = [];
                if ($isUpdate && is_array($existing->custom_dates)) {
                    foreach ($existing->custom_dates as $existingDate) {
                        $existingCustom[] = substr((string) $existingDate, 0, 10);
                    }
                }

                foreach ((array) $this->input('custom_dates', []) as $index => $date) {
                    $ymd = substr((string) $date, 0, 10);
                    $parsed = CarbonImmutable::parse($ymd, $timezone)->startOfDay();
                    // Keep dates that were already on the rule; only reject newly added past ones.
                    if ($parsed->lt($today) && ! in_array($ymd, $existingCustom, true)) {
                        $validator->errors()->add(
                            "custom_dates.{$index}",
                            'Custom dates cannot be in the past (schedule timezone).'
                        );
                    }
                }
            }

            if ($this->input('ends_type') === 'on_date' && filled($this->input('ends_on'))) {
                $endsOn = CarbonImmutable::parse((string) $this->input('ends_on'), $timezone)->startOfDay();
                if ($endsOn->lt($startsOn)) {
                    $validator->errors()->add(
                        'ends_on',
                        'The end date must be on or after the start date.'
                    );
                }
            }

            // Same calendar day as "today" in the schedule zone, but the wall
            // clock start has already passed — only when the start instant is
            // new or changed. An existing batch that already started must stay
            // editable (trainer photo, flags, notes, etc.).
            if ($startsOn->equalTo($today) && filled($this->input('start_time'))) {
                $submittedTime = substr((string) $this->input('start_time'), 0, 5);
                $existingTime = $isUpdate
                    ? substr((string) $existing->normalizedStartTime(), 0, 5)
                    : null;
                $startTimeUnchanged = $startsOnUnchanged
                    && $existingTime !== null
                    && $existingTime === $submittedTime;

                if (! $startTimeUnchanged) {
                    try {
                        $startAt = CarbonImmutable::parse(
                            $startsOnRaw.' '.$submittedTime,
                            $timezone
                        );
                        if ($startAt->lte($now)) {
                            $validator->errors()->add(
                                'start_time',
                                'This start time has already passed.'
                            );
                        }
                    } catch (\Throwable) {
                        // date_format rule already covers malformed times
                    }
                }
            }
        });
    }

    /**
     * Normalised attributes ready for a mass assign.
     *
     * @return array<string, mixed>
     */
    public function scheduleAttributes(): array
    {
        $data = $this->validated();
        $type = $data['recurrence_type'];

        // Clear the fields the chosen recurrence type does not use, so a rule
        // edited from weekly to monthly can't keep generating weekly dates.
        $data['custom_dates'] = $type === CourseSchedule::RECURRENCE_CUSTOM_DATES
            ? array_values(array_unique($data['custom_dates'] ?? []))
            : null;
        $data['repeat_custom_monthly'] = $type === CourseSchedule::RECURRENCE_CUSTOM_DATES
            && (bool) ($data['repeat_custom_monthly'] ?? false);
        $data['weekdays'] = $type === CourseSchedule::RECURRENCE_WEEKLY
            ? array_values(array_unique(array_map('intval', $data['weekdays'] ?? [])))
            : null;
        $data['month_days'] = $type === CourseSchedule::RECURRENCE_MONTHLY_DAYS
            ? array_values(array_unique(array_map('intval', $data['month_days'] ?? [])))
            : null;

        if (! in_array($type, [CourseSchedule::RECURRENCE_WEEKLY, CourseSchedule::RECURRENCE_MONTHLY_DAYS], true)) {
            $data['repeat_interval'] = 1;
        }

        if ($data['ends_type'] !== 'on_date') {
            $data['ends_on'] = null;
        }

        if ($data['ends_type'] !== 'after_count') {
            $data['max_occurrences'] = null;
        }

        // A one-off batch can never repeat.
        if ($type === CourseSchedule::RECURRENCE_ONCE) {
            $data['ends_type'] = 'after_count';
            $data['max_occurrences'] = 1;
            $data['ends_on'] = null;
        }

        $data['start_time'] = $this->normalizeWallTime($data['start_time']);
        $data['end_time'] = $this->normalizeWallTime($data['end_time']);

        $data['repeat_interval'] ??= 1;
        $data['missing_day_policy'] ??= 'skip';
        $data['cta_type'] ??= 'enroll';
        $data['enrollment_closes_hours'] ??= 0;
        $data['sort_order'] ??= 0;

        foreach (['repeat_custom_monthly', 'show_seats_left', 'show_countdown', 'is_featured', 'is_active'] as $flag) {
            $data[$flag] = (bool) ($data[$flag] ?? ($flag === 'is_active' || $flag === 'show_countdown'));
        }

        return $data;
    }

    /**
     * Persist wall times as HH:MM:SS without doubling ":00" when the client
     * already sent seconds (or a driver-shaped value slipped through).
     */
    private function normalizeWallTime(string $value): string
    {
        if (preg_match('/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/', trim($value), $match) !== 1) {
            return $value;
        }

        return sprintf(
            '%02d:%02d:%02d',
            (int) $match[1],
            (int) $match[2],
            (int) ($match[3] ?? 0),
        );
    }
}
