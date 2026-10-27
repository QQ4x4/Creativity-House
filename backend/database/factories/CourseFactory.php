<?php

namespace Database\Factories;

use App\Models\Course;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Course>
 */
class CourseFactory extends Factory
{
    protected $model = Course::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = 'Course '.fake()->unique()->numberBetween(1, 999999);

        return [
            'title' => $title,
            'slug' => Str::slug($title).'-'.Str::lower(Str::random(6)),
            'title_en' => $title,
            'title_ar' => $title,
            'description' => fake()->sentence(),
            'price' => 1200,
            'currency' => 'USD',
            'default_mode' => 'live',
            'available_modes' => ['live'],
            'is_published' => true,
            'is_public' => true,
            'instructor_name' => fake()->name(),
        ];
    }

    public function unpublished(): static
    {
        return $this->state(fn (array $attributes) => ['is_published' => false]);
    }
}
