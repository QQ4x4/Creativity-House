<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * Public catalog payload — bilingual snake_case, no enrollment or progress.
 *
 * @mixin Course
 */
class PublicCourseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $outcomes = $this->localizedList($this->learning_outcomes);
        $audience = $this->localizedList($this->target_audience);
        $credentials = $this->localizedList($this->instructor_credentials);

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'category' => $this->category,
            'default_mode' => $this->default_mode,
            'available_modes' => $this->available_modes ?? [],
            'badge' => $this->badge,
            'badge_en' => $this->badge,
            'badge_ar' => $this->badge_ar ?: $this->badge,
            'title' => $this->title,
            'title_en' => $this->title_en ?: $this->title,
            'title_ar' => $this->title_ar ?: $this->title,
            'subtitle_en' => $this->subtitle_en,
            'subtitle_ar' => $this->subtitle_ar,
            'description' => $this->description,
            'description_en' => $this->description_en ?: $this->description,
            'description_ar' => $this->description_ar ?: $this->description,
            'price' => (float) $this->price,
            'original_price' => $this->original_price !== null ? (float) $this->original_price : (float) $this->price,
            'currency' => $this->currency ?: 'USD',
            'rating' => $this->rating !== null ? (float) $this->rating : null,
            'students_count' => (int) $this->students_count,
            'duration_hours' => (float) $this->total_hours,
            'duration_label_en' => $this->duration_label_en,
            'duration_label_ar' => $this->duration_label_ar,
            'language_en' => $this->language_en,
            'language_ar' => $this->language_ar,
            'last_updated' => optional($this->last_updated_at)?->toDateString(),
            'cover_image' => $this->resolveCoverImage(),
            'instructor_name' => $this->instructor_name,
            'instructor_name_ar' => $this->instructor_name_ar ?: $this->instructor_name,
            'instructor_title_en' => $this->instructor_title_en,
            'instructor_title_ar' => $this->instructor_title_ar ?: $this->instructor_title_en,
            'instructor_bio_en' => $this->instructor_bio_en,
            'instructor_bio_ar' => $this->instructor_bio_ar,
            'instructor_photo' => $this->instructor_photo,
            'instructor_trained' => $this->instructor_trained,
            'instructor_countries' => $this->instructor_countries,
            'instructor_credentials' => $credentials['en'],
            'instructor_credentials_en' => $credentials['en'],
            'instructor_credentials_ar' => $credentials['ar'],
            'target_audience_en' => $audience['en'],
            'target_audience_ar' => $audience['ar'],
            'learning_outcomes_en' => $outcomes['en'],
            'learning_outcomes_ar' => $outcomes['ar'],
            'curriculum' => $this->syllabus(),
            'schedule_en' => $this->schedule_en,
            'schedule_ar' => $this->schedule_ar,
            'modes' => $this->catalog_modes ?? [],
            'seo' => [
                'title' => $this->seo_title,
                'description' => $this->seo_description,
                'keywords' => $this->seo_keywords ?? [],
            ],
        ];
    }

    /**
     * Syllabus preview derived from the `modules` + `lessons` tables — the same
     * rows the student player reads, so the marketing page can never drift from
     * the real curriculum.
     *
     * Falls back to the legacy `courses.curriculum` JSON for courses that have
     * not been migrated to modules yet.
     *
     * @return list<array<string, mixed>>
     */
    private function syllabus(): array
    {
        if (! $this->relationLoaded('modules')) {
            return $this->curriculum ?? [];
        }

        $modules = $this->modules;

        if ($modules->isEmpty()) {
            return $this->curriculum ?? [];
        }

        return $modules->map(function ($module): array {
            $titles = $module->lessons->pluck('title')->map(strval(...))->values()->all();
            $seconds = (int) $module->lessons->sum('duration');

            return [
                'title_en' => $module->title_en,
                'title_ar' => $module->title_ar ?: $module->title_en,
                'duration_en' => $module->duration_label_en ?: $this->durationLabel($seconds, 'en'),
                'duration_ar' => $module->duration_label_ar
                    ?: ($module->duration_label_en ?: $this->durationLabel($seconds, 'ar')),
                // Lesson titles are single-language in the lessons table.
                'lessons_en' => $titles,
                'lessons_ar' => $titles,
            ];
        })->values()->all();
    }

    /**
     * Human duration for a module, rounded to a sensible unit.
     */
    private function durationLabel(int $seconds, string $locale): string
    {
        if ($seconds <= 0) {
            return $locale === 'ar' ? 'قريبًا' : 'Coming soon';
        }

        $minutes = (int) round($seconds / 60);

        if ($minutes < 60) {
            return $locale === 'ar' ? "{$minutes} دقيقة" : "{$minutes} min";
        }

        $hours = round($seconds / 3600, 1);
        $hours = floor($hours) == $hours ? (int) $hours : $hours;

        return $locale === 'ar' ? "{$hours} ساعة" : "{$hours} hours";
    }

    /**
     * @return array{en: list<mixed>, ar: list<mixed>}
     */
    private function localizedList(mixed $value): array
    {
        if (! is_array($value)) {
            return ['en' => [], 'ar' => []];
        }

        if (array_key_exists('en', $value) || array_key_exists('ar', $value)) {
            return [
                'en' => array_values($value['en'] ?? []),
                'ar' => array_values($value['ar'] ?? []),
            ];
        }

        return ['en' => array_values($value), 'ar' => array_values($value)];
    }

    private function resolveCoverImage(): ?string
    {
        $value = $this->cover_image;

        if (blank($value)) {
            return null;
        }

        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://') || str_starts_with($value, '/')) {
            return $value;
        }

        return Storage::disk('public')->url($value);
    }
}
