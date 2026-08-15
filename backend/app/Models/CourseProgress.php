<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $user_id
 * @property int $course_id
 * @property array<int, int> $completed_lessons
 * @property int $completion_percentage
 * @property int $total_learning_seconds
 */
class CourseProgress extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'course_progress';

    protected $fillable = [
        'user_id',
        'course_id',
        'completed_lessons',
        'completion_percentage',
        'total_learning_seconds',
        'last_lesson_id',
        'completed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'course_id' => 'integer',
            'completed_lessons' => 'array',
            'completion_percentage' => 'integer',
            'total_learning_seconds' => 'integer',
            'last_lesson_id' => 'integer',
            'completed_at' => 'datetime',
        ];
    }

    protected $attributes = [
        'completed_lessons' => '[]',
        'completion_percentage' => 0,
        'total_learning_seconds' => 0,
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * @return BelongsTo<Lesson, $this>
     */
    public function lastLesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class, 'last_lesson_id');
    }

    /**
     * Completed lesson IDs, always a clean list of ints.
     *
     * @return list<int>
     */
    public function completedLessonIds(): array
    {
        $ids = is_array($this->completed_lessons) ? $this->completed_lessons : [];

        return array_values(array_unique(array_map('intval', $ids)));
    }

    public function isComplete(): bool
    {
        return $this->completion_percentage >= 100;
    }
}
