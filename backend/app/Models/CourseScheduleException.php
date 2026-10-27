<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A per-date edit of a generated batch: cancelled, sold out, or field overrides.
 *
 * @property int $id
 * @property int $course_schedule_id
 * @property string $status
 */
class CourseScheduleException extends Model
{
    use HasFactory;

    public const STATUS_MODIFIED = 'modified';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_SOLD_OUT = 'sold_out';

    /** @var list<string> */
    public const STATUSES = [
        self::STATUS_MODIFIED,
        self::STATUS_CANCELLED,
        self::STATUS_SOLD_OUT,
    ];

    protected $fillable = [
        'course_schedule_id',
        'occurrence_date',
        'status',
        'start_time',
        'end_time',
        'duration_days',
        'price',
        'original_price',
        'seats_total',
        'batch_number',
        'trainer_name_en',
        'trainer_name_ar',
        'trainer_photo',
        'note_en',
        'note_ar',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'course_schedule_id' => 'integer',
            'duration_days' => 'integer',
            'price' => 'decimal:2',
            'original_price' => 'decimal:2',
            'seats_total' => 'integer',
            'batch_number' => 'integer',
        ];
    }

    /**
     * A calendar date in the schedule's timezone, never an instant — kept as a
     * plain Y-m-d string so `where('occurrence_date', $date)` matches on every
     * driver. The `date` cast would write "Y-m-d H:i:s" and silently miss.
     */
    protected function occurrenceDate(): Attribute
    {
        return Attribute::make(
            get: static fn (mixed $value): string => substr((string) $value, 0, 10),
            set: static fn (mixed $value): string => CarbonImmutable::parse($value)->format('Y-m-d'),
        );
    }

    /**
     * @return BelongsTo<CourseSchedule, $this>
     */
    public function schedule(): BelongsTo
    {
        return $this->belongsTo(CourseSchedule::class, 'course_schedule_id');
    }
}
