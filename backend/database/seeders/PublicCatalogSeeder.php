<?php

namespace Database\Seeders;

use App\Models\Course;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

/**
 * Seeds the six public catalog courses (bilingual) used by GET /api/courses.
 * Source of truth: frontend/lib/catalog/data.js → database/data/public_catalog.json
 *
 * Idempotent on slug. Student demo courses stay private (is_public = false).
 */
class PublicCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/public_catalog.json');

        if (! File::exists($path)) {
            $this->command?->error('Missing '.$path);

            return;
        }

        /** @var array{instructor?: array<string, mixed>, courses?: list<array<string, mixed>>} $payload */
        $payload = json_decode(File::get($path), true, 512, JSON_THROW_ON_ERROR);
        $instructor = $payload['instructor'] ?? [];
        $courses = $payload['courses'] ?? [];

        foreach ($courses as $index => $course) {
            $this->seedPublicCourse($course, $instructor, $index + 10);
        }

        $this->command?->info('Public catalog seeded ('.count($courses).' courses).');
    }

    /**
     * @param  array<string, mixed>  $course
     * @param  array<string, mixed>  $instructor
     */
    private function seedPublicCourse(array $course, array $instructor, int $sortOrder): void
    {
        Course::updateOrCreate(
            ['slug' => $course['slug']],
            [
                'title' => $course['title_en'],
                'title_en' => $course['title_en'],
                'title_ar' => $course['title_ar'],
                'subtitle_en' => $course['subtitle_en'] ?? null,
                'subtitle_ar' => $course['subtitle_ar'] ?? null,
                'description' => $course['description_en'] ?? null,
                'description_en' => $course['description_en'] ?? null,
                'description_ar' => $course['description_ar'] ?? null,
                'price' => $course['price'],
                'original_price' => $course['original_price'] ?? $course['price'],
                'currency' => $course['currency'] ?? 'USD',
                'cover_image' => $course['cover_image'] ?? null,
                'total_hours' => $course['duration_hours'] ?? 0,
                'duration_label_en' => $course['duration_label_en'] ?? null,
                'duration_label_ar' => $course['duration_label_ar'] ?? null,
                'language_en' => $course['language_en'] ?? null,
                'language_ar' => $course['language_ar'] ?? null,
                'instructor_name' => $instructor['name_en'] ?? ($course['instructor_name'] ?? 'Dr. Talaat El-Awady'),
                'instructor_bio_en' => $instructor['bio_en'] ?? null,
                'instructor_bio_ar' => $instructor['bio_ar'] ?? null,
                'instructor_photo' => $instructor['photo'] ?? null,
                'instructor_credentials' => [
                    'en' => $instructor['credentials_en'] ?? [],
                    'ar' => $instructor['credentials_ar'] ?? [],
                    'title_en' => $instructor['title_en'] ?? null,
                    'title_ar' => $instructor['title_ar'] ?? null,
                    'trained' => $instructor['trained'] ?? null,
                    'countries' => $instructor['countries'] ?? null,
                ],
                'level' => 'professional',
                'badge' => $course['badge_en'] ?? null,
                'badge_ar' => $course['badge_ar'] ?? null,
                'category' => $course['category'] ?? 'recorded',
                'rating' => $course['rating'] ?? null,
                'students_count' => $course['students_count'] ?? 0,
                'last_updated_at' => $course['last_updated'] ?? now()->toDateString(),
                'default_mode' => $course['defaultMode'] ?? 'recorded',
                'available_modes' => $course['availableModes'] ?? [],
                'learning_outcomes' => [
                    'en' => $course['learning_outcomes_en'] ?? [],
                    'ar' => $course['learning_outcomes_ar'] ?? [],
                ],
                'target_audience' => [
                    'en' => $course['target_audience_en'] ?? [],
                    'ar' => $course['target_audience_ar'] ?? [],
                ],
                'curriculum' => $course['curriculum'] ?? [],
                'catalog_modes' => $course['modes'] ?? [],
                'schedule_en' => $course['schedule_en'] ?? null,
                'schedule_ar' => $course['schedule_ar'] ?? null,
                'is_published' => true,
                'is_public' => true,
                'sort_order' => $sortOrder,
                'seo_title' => ($course['title_en'] ?? 'Course').' | Creativity House',
                'seo_description' => $course['subtitle_en'] ?? ($course['description_en'] ?? null),
                'seo_keywords' => ['PMP', 'PMI', 'project management', $course['slug']],
            ]
        );
    }
}
