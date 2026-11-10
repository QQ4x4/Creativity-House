<?php

namespace Database\Factories;

use App\Models\Testimonial;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Testimonial>
 */
class TestimonialFactory extends Factory
{
    protected $model = Testimonial::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        static $position = 0;
        $position++;

        return [
            'bunny_video_id' => fake()->uuid(),
            'bunny_collection_id' => null,
            'video_title' => fake()->sentence(3),
            'duration_seconds' => fake()->numberBetween(30, 300),
            'orientation' => 'landscape',
            'person_name_en' => fake()->name(),
            'person_name_ar' => 'طالب تجريبي',
            'person_role_en' => 'Project Manager, Acme',
            'person_role_ar' => 'مدير مشاريع',
            'country' => 'Saudi Arabia',
            'course_id' => null,
            'caption_en' => fake()->sentence(8),
            'caption_ar' => 'تعليق قصير عن التجربة',
            'quote_en' => fake()->sentence(12),
            'quote_ar' => null,
            'custom_thumbnail_path' => null,
            'is_featured' => false,
            'is_published' => true,
            'position' => $position,
        ];
    }

    public function draft(): static
    {
        return $this->state(fn () => ['is_published' => false]);
    }

    public function featured(): static
    {
        return $this->state(fn () => ['is_featured' => true, 'is_published' => true]);
    }
}
