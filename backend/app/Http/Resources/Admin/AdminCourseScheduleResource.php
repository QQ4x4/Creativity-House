<?php

namespace App\Http\Resources\Admin;

use App\Support\PublicMediaUrl;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Raw editable batch rule — the exact shape the Schedules tab posts back.
 *
 * Dates are always Y-m-d, times always H:i, JSON arrays are real arrays of
 * ints/strings (never JSON strings), and trainer_photo is a full public URL.
 *
 * @mixin \App\Models\CourseSchedule
 */
class AdminCourseScheduleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'course_id' => (int) $this->course_id,
            'delivery_mode' => $this->delivery_mode,

            'title_en' => $this->title_en,
            'title_ar' => $this->title_ar,
            'batch_number' => $this->batch_number !== null ? (int) $this->batch_number : null,

            'time_slot' => $this->time_slot,
            'resolved_time_slot' => $this->resolveTimeSlot(),
            'format' => $this->format,
            'location_en' => $this->location_en,
            'location_ar' => $this->location_ar,

            'timezone' => $this->timezone,
            // HH:MM — the admin form uses <input type="time">.
            'start_time' => substr($this->normalizedStartTime(), 0, 5),
            'end_time' => substr($this->normalizedEndTime(), 0, 5),
            'duration_days' => (int) $this->duration_days,

            'recurrence_type' => $this->recurrence_type,
            'starts_on' => $this->formatDate($this->starts_on),
            'custom_dates' => $this->normalizeDateList($this->custom_dates),
            'repeat_custom_monthly' => (bool) $this->repeat_custom_monthly,
            'weekdays' => $this->normalizeIntList($this->weekdays),
            'repeat_interval' => (int) ($this->repeat_interval ?: 1),
            'month_days' => $this->normalizeIntList($this->month_days),
            'missing_day_policy' => $this->missing_day_policy ?: 'skip',

            'ends_type' => $this->ends_type,
            'ends_on' => $this->formatDate($this->ends_on),
            'max_occurrences' => $this->max_occurrences !== null ? (int) $this->max_occurrences : null,

            'price' => $this->price !== null ? (float) $this->price : null,
            'original_price' => $this->original_price !== null ? (float) $this->original_price : null,
            'promo_text_en' => $this->promo_text_en,
            'promo_text_ar' => $this->promo_text_ar,

            'seats_total' => $this->seats_total !== null ? (int) $this->seats_total : null,
            'show_seats_left' => (bool) $this->show_seats_left,
            'enrollment_closes_hours' => (int) $this->enrollment_closes_hours,

            'cta_type' => $this->cta_type ?: 'enroll',

            'trainer_name_en' => $this->trainer_name_en,
            'trainer_name_ar' => $this->trainer_name_ar,
            'trainer_title_en' => $this->trainer_title_en,
            'trainer_title_ar' => $this->trainer_title_ar,
            'trainer_photo' => PublicMediaUrl::resolve($this->trainer_photo),

            'show_countdown' => (bool) $this->show_countdown,
            'is_featured' => (bool) $this->is_featured,
            'is_active' => (bool) $this->is_active,
            'notes_en' => $this->notes_en,
            'notes_ar' => $this->notes_ar,
            'sort_order' => (int) $this->sort_order,

            'exceptions' => AdminScheduleExceptionResource::collection(
                $this->whenLoaded('exceptions', fn () => $this->exceptions, collect())
            ),
        ];
    }

    private function formatDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof CarbonInterface) {
            return $value->format('Y-m-d');
        }

        return substr((string) $value, 0, 10);
    }

    /**
     * @param  mixed  $value
     * @return list<string>
     */
    private function normalizeDateList(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $dates = [];
        foreach ($value as $item) {
            $date = substr((string) $item, 0, 10);
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) === 1) {
                $dates[] = $date;
            }
        }

        return array_values(array_unique($dates));
    }

    /**
     * @param  mixed  $value
     * @return list<int>
     */
    private function normalizeIntList(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        return array_values(array_unique(array_map('intval', $value)));
    }
}
