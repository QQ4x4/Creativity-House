<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One session inside a cohort (multi-session) schedule.
 *
 * @property int $id
 * @property int $course_schedule_id
 * @property int $position
 * @property string $date
 * @property mixed $start_time
 * @property mixed $end_time
 * @property string|null $title_en
 * @property string|null $title_ar
 * @property int|null $phase_index
 */
class CourseScheduleSession extends Model
{
    protected $fillable = [
        'course_schedule_id',
        'position',
        'date',
        'start_time',
        'end_time',
        'title_en',
        'title_ar',
        'phase_index',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'course_schedule_id' => 'integer',
            'position' => 'integer',
            'date' => 'date',
            'phase_index' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<CourseSchedule, $this>
     */
    public function schedule(): BelongsTo
    {
        return $this->belongsTo(CourseSchedule::class, 'course_schedule_id');
    }

    public function normalizedStartTime(): string
    {
        return $this->normalizeTime($this->start_time);
    }

    public function normalizedEndTime(): string
    {
        return $this->normalizeTime($this->end_time);
    }

    public function normalizeTime(mixed $value): string
    {
        $text = trim((string) $value);

        if ($text === '') {
            return '00:00:00';
        }

        if (preg_match('/(\d{1,2}):(\d{2})(?::(\d{2}))?/', $text, $match) !== 1) {
            return '00:00:00';
        }

        return sprintf(
            '%02d:%02d:%02d',
            (int) $match[1],
            (int) $match[2],
            (int) ($match[3] ?? 0)
        );
    }

    /**
     * Public / admin JSON row.
     *
     * @return array<string, mixed>
     */
    public function toPayload(): array
    {
        return [
            'position' => (int) $this->position,
            'date' => $this->date instanceof \DateTimeInterface
                ? $this->date->format('Y-m-d')
                : substr((string) $this->date, 0, 10),
            'start_time' => substr($this->normalizedStartTime(), 0, 5),
            'end_time' => substr($this->normalizedEndTime(), 0, 5),
            'title_en' => $this->title_en,
            'title_ar' => $this->title_ar,
            'phase_index' => $this->phase_index !== null ? (int) $this->phase_index : null,
        ];
    }
}
