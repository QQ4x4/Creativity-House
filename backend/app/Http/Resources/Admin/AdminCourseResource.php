<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The editor's hydration payload: raw column values, never localized.
 *
 * Bilingual list columns are normalized to {en: [], ar: []} so the React Hook
 * Form defaults have a stable shape even for rows seeded with a flat array.
 *
 * @mixin \App\Models\Course
 */
class AdminCourseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,

            /* ─── Basic info ─────────────────────────────────────────────── */
            'title_en' => $this->title_en ?: $this->title,
            'title_ar' => $this->title_ar,
            'subtitle_en' => $this->subtitle_en,
            'subtitle_ar' => $this->subtitle_ar,
            'slug' => $this->slug,
            'badge' => $this->badge,
            'badge_ar' => $this->badge_ar,
            'category' => $this->category,
            'language_en' => $this->language_en,
            'language_ar' => $this->language_ar,
            'level' => $this->level,

            /* ─── Publishing ─────────────────────────────────────────────── */
            'is_published' => (bool) $this->is_published,
            'is_public' => (bool) $this->is_public,
            'sort_order' => (int) $this->sort_order,

            /* ─── Pricing & modes ────────────────────────────────────────── */
            'price' => (float) $this->price,
            'original_price' => $this->original_price !== null ? (float) $this->original_price : null,
            'currency' => $this->currency ?: 'USD',
            'available_modes' => array_values($this->available_modes ?? []),
            'default_mode' => $this->default_mode,
            'catalog_modes' => (object) ($this->catalog_modes ?? []),

            /* ─── Marketing ──────────────────────────────────────────────── */
            'description_en' => $this->description_en ?: $this->description,
            'description_ar' => $this->description_ar,
            'schedule_en' => $this->schedule_en,
            'schedule_ar' => $this->schedule_ar,
            'target_audience' => $this->bilingualList($this->target_audience),
            'learning_outcomes' => $this->bilingualList($this->learning_outcomes),

            /* ─── Media & stats ──────────────────────────────────────────── */
            'cover_image' => $this->cover_image,
            'rating' => $this->rating !== null ? (float) $this->rating : null,
            'students_count' => (int) $this->students_count,
            'total_hours' => $this->total_hours !== null ? (float) $this->total_hours : null,
            'duration_label_en' => $this->duration_label_en,
            'duration_label_ar' => $this->duration_label_ar,
            'last_updated_at' => optional($this->last_updated_at)?->toDateString(),

            /* ─── Instructor ─────────────────────────────────────────────── */
            'instructor_name' => $this->instructor_name,
            'instructor_name_ar' => $this->instructor_name_ar,
            'instructor_title_en' => $this->instructor_title_en,
            'instructor_title_ar' => $this->instructor_title_ar,
            'instructor_bio_en' => $this->instructor_bio_en,
            'instructor_bio_ar' => $this->instructor_bio_ar,
            'instructor_photo' => $this->instructor_photo,
            'instructor_trained' => $this->instructor_trained,
            'instructor_countries' => $this->instructor_countries !== null
                ? (int) $this->instructor_countries
                : null,
            'instructor_credentials' => $this->bilingualList($this->instructor_credentials),

            /* ─── SEO ────────────────────────────────────────────────────── */
            'seo_title' => $this->seo_title,
            'seo_description' => $this->seo_description,
            'seo_keywords' => array_values($this->seo_keywords ?? []),

            /* ─── Curriculum ─────────────────────────────────────────────── */
            'modules' => AdminModuleResource::collection(
                $this->whenLoaded('modules', fn () => $this->modules, collect())
            ),
        ];
    }

    /**
     * Legacy rows store a flat list that applies to both languages.
     *
     * @return array{en: list<string>, ar: list<string>}
     */
    private function bilingualList(mixed $value): array
    {
        if (! is_array($value)) {
            return ['en' => [], 'ar' => []];
        }

        if (array_key_exists('en', $value) || array_key_exists('ar', $value)) {
            return [
                'en' => array_values(array_map(strval(...), $value['en'] ?? [])),
                'ar' => array_values(array_map(strval(...), $value['ar'] ?? [])),
            ];
        }

        $flat = array_values(array_map(strval(...), $value));

        return ['en' => $flat, 'ar' => $flat];
    }
}
