<?php

namespace App\Http\Resources\Admin;

use App\Support\PublicMediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\CourseScheduleException
 */
class AdminScheduleExceptionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'course_schedule_id' => (int) $this->course_schedule_id,
            'occurrence_date' => substr((string) $this->occurrence_date, 0, 10),
            'status' => $this->status,
            'start_time' => $this->formatTime($this->start_time),
            'end_time' => $this->formatTime($this->end_time),
            'duration_days' => $this->duration_days !== null ? (int) $this->duration_days : null,
            'price' => $this->price !== null ? (float) $this->price : null,
            'original_price' => $this->original_price !== null ? (float) $this->original_price : null,
            'seats_total' => $this->seats_total !== null ? (int) $this->seats_total : null,
            'batch_number' => $this->batch_number !== null ? (int) $this->batch_number : null,
            'trainer_name_en' => $this->trainer_name_en,
            'trainer_name_ar' => $this->trainer_name_ar,
            'trainer_photo' => PublicMediaUrl::resolve($this->trainer_photo),
            'note_en' => $this->note_en,
            'note_ar' => $this->note_ar,
        ];
    }

    private function formatTime(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $text = trim((string) $value);

        if (preg_match('/(\d{1,2}):(\d{2})/', $text, $match) !== 1) {
            return null;
        }

        return sprintf('%02d:%02d', (int) $match[1], (int) $match[2]);
    }
}
