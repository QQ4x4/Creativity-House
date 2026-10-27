<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\CourseSchedule;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Defaults to a single one-off batch, so each test only states the recurrence
 * fields it actually cares about.
 *
 * @extends Factory<CourseSchedule>
 */
class CourseScheduleFactory extends Factory
{
    protected $model = CourseSchedule::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'delivery_mode' => null,
            'format' => 'online',
            'timezone' => 'Asia/Kuala_Lumpur',
            'start_time' => '09:00:00',
            'end_time' => '17:00:00',
            'duration_days' => 1,
            'recurrence_type' => CourseSchedule::RECURRENCE_ONCE,
            'starts_on' => now()->addMonth()->format('Y-m-d'),
            'repeat_interval' => 1,
            'missing_day_policy' => 'skip',
            'ends_type' => 'never',
            'enrollment_closes_hours' => 0,
            'cta_type' => 'enroll',
            'show_countdown' => true,
            'is_featured' => false,
            'is_active' => true,
            'sort_order' => 0,
        ];
    }
}
