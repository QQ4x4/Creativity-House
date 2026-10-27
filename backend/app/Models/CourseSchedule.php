<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A recurring (or one-off) batch rule for a course. Individual dates are never
 * stored — ScheduleOccurrenceService expands them on read, because the app has
 * no cron to materialise them.
 *
 * @property int $id
 * @property int $course_id
 * @property string $recurrence_type
 * @property string $timezone
 */
class CourseSchedule extends Model
{
    use HasFactory, SoftDeletes;

    public const RECURRENCE_ONCE = 'once';

    public const RECURRENCE_CUSTOM_DATES = 'custom_dates';

    public const RECURRENCE_WEEKLY = 'weekly';

    public const RECURRENCE_MONTHLY_DAYS = 'monthly_days';

    /** @var list<string> */
    public const RECURRENCE_TYPES = [
        self::RECURRENCE_ONCE,
        self::RECURRENCE_CUSTOM_DATES,
        self::RECURRENCE_WEEKLY,
        self::RECURRENCE_MONTHLY_DAYS,
    ];

    /** @var list<string> */
    public const FORMATS = ['online', 'in_person', 'hybrid'];

    /** @var list<string> */
    public const TIME_SLOTS = ['morning', 'afternoon', 'evening'];

    /** @var list<string> */
    public const ENDS_TYPES = ['never', 'on_date', 'after_count'];

    /** @var list<string> */
    public const MISSING_DAY_POLICIES = ['skip', 'last_day'];

    /** @var list<string> */
    public const CTA_TYPES = ['enroll', 'inquiry'];

    protected $fillable = [
        'course_id',
        'delivery_mode',
        'title_en',
        'title_ar',
        'batch_label_en',
        'batch_label_ar',
        'batch_number',
        'time_slot',
        'format',
        'location_en',
        'location_ar',
        'timezone',
        'start_time',
        'end_time',
        'duration_days',
        'recurrence_type',
        'starts_on',
        'custom_dates',
        'repeat_custom_monthly',
        'weekdays',
        'repeat_interval',
        'month_days',
        'missing_day_policy',
        'ends_type',
        'ends_on',
        'max_occurrences',
        'price',
        'original_price',
        'promo_text_en',
        'promo_text_ar',
        'seats_total',
        'show_seats_left',
        'enrollment_closes_hours',
        'cta_type',
        'trainer_name_en',
        'trainer_name_ar',
        'trainer_title_en',
        'trainer_title_ar',
        'trainer_photo',
        'show_countdown',
        'is_featured',
        'is_active',
        'notes_en',
        'notes_ar',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'course_id' => 'integer',
            'batch_number' => 'integer',
            'duration_days' => 'integer',
            'starts_on' => 'date',
            'custom_dates' => 'array',
            'repeat_custom_monthly' => 'boolean',
            'weekdays' => 'array',
            'repeat_interval' => 'integer',
            'month_days' => 'array',
            'ends_on' => 'date',
            'max_occurrences' => 'integer',
            'price' => 'decimal:2',
            'original_price' => 'decimal:2',
            'seats_total' => 'integer',
            'show_seats_left' => 'boolean',
            'enrollment_closes_hours' => 'integer',
            'show_countdown' => 'boolean',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /* ─── Relations ─────────────────────────────────────────────────────── */

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * @return HasMany<CourseScheduleException, $this>
     */
    public function exceptions(): HasMany
    {
        return $this->hasMany(CourseScheduleException::class)->orderBy('occurrence_date');
    }

    /* ─── Scopes ────────────────────────────────────────────────────────── */

    /**
     * @param  Builder<CourseSchedule>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /* ─── Helpers ───────────────────────────────────────────────────────── */

    /**
     * Admin override wins; otherwise derive from the local start hour:
     * before 12:00 morning, 12:00–16:59 afternoon, 17:00+ evening.
     */
    public function resolveTimeSlot(): string
    {
        if (in_array($this->time_slot, self::TIME_SLOTS, true)) {
            return (string) $this->time_slot;
        }

        $hour = (int) substr((string) $this->start_time, 0, 2);

        return match (true) {
            $hour < 12 => 'morning',
            $hour < 17 => 'afternoon',
            default => 'evening',
        };
    }

    /**
     * "HH:MM:SS" regardless of how the driver returned the time column.
     */
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

        // MySQL returns "09:30:00"; SQLite can hand back a full datetime string.
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
}
