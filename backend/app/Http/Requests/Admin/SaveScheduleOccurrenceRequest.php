<?php

namespace App\Http\Requests\Admin;

use App\Models\CourseScheduleException;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A per-date override (cancel, mark sold out, or change a few fields) for one
 * generated batch.
 */
class SaveScheduleOccurrenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    protected function prepareForValidation(): void
    {
        foreach ([
            'start_time',
            'end_time',
            'price',
            'original_price',
            'seats_total',
            'duration_days',
            'batch_number',
            'trainer_name_en',
            'trainer_name_ar',
            'trainer_photo',
            'note_en',
            'note_ar',
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
        $url = config('field_limits.url');

        return [
            'status' => ['required', Rule::in(CourseScheduleException::STATUSES)],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i'],
            'duration_days' => ['nullable', 'integer', 'between:1,365'],
            'price' => ['nullable', 'numeric', 'between:0,99999999.99'],
            'original_price' => ['nullable', 'numeric', 'between:0,99999999.99'],
            'seats_total' => ['nullable', 'integer', 'between:1,100000'],
            'batch_number' => ['nullable', 'integer', 'min:1'],
            'trainer_name_en' => ['nullable', 'string', 'max:'.$medium],
            'trainer_name_ar' => ['nullable', 'string', 'max:'.$medium],
            'trainer_photo' => ['nullable', 'string', 'max:'.$url],
            'note_en' => ['nullable', 'string', 'max:'.$medium],
            'note_ar' => ['nullable', 'string', 'max:'.$medium],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function exceptionAttributes(): array
    {
        $data = $this->validated();

        foreach (['start_time', 'end_time'] as $key) {
            if (! filled($data[$key] ?? null)) {
                $data[$key] = null;

                continue;
            }

            $data[$key] = $this->normalizeWallTime((string) $data[$key]);
        }

        return $data;
    }

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
