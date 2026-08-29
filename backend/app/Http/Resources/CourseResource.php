<?php

namespace App\Http\Resources;

use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin Course
 *
 * `enrolled_at`, `next_lesson_id`, and `has_certificate` are transient attributes
 * set by CourseService (student↔course pairing — not course columns).
 *
 * Certificates come only from `course_certificates` via CertificateService —
 * never from progress === 100%.
 */
class CourseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $lessonCount = $this->resolveLessonCount();
        $totalDurationHours = $this->resolveTotalDurationHours();
        $hasCertificate = (bool) ($this->getAttribute('has_certificate') ?? false);

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'description' => $this->description,
            'price' => (float) $this->price,
            'currency' => $this->currency,
            'cover_image_url' => $this->resolveCoverImage(),
            'instructor_name' => $this->instructor_name,
            'level' => $this->level,

            // Live curriculum metrics from lessons table (never hardcoded).
            'lesson_count' => $lessonCount,
            'total_lessons' => $lessonCount,
            'total_duration_hours' => $totalDurationHours,
            'total_hours' => $totalDurationHours,

            'enrolled_at' => $this->transientDate('enrolled_at'),
            'has_certificate' => $hasCertificate,
            // Legacy alias — same boolean as has_certificate (not progress-based).
            'certificate_earned' => $hasCertificate,
            'next_lesson_id' => $this->getAttribute('next_lesson_id'),

            'progress' => $this->whenLoaded(
                'progressForUser',
                fn () => $this->progressForUser
                    ? (new ProgressResource($this->progressForUser))->withTotalLessons($lessonCount)
                    : null
            ),

            'lessons' => LessonResource::collection($this->whenLoaded('lessons')),

            'seo' => [
                'title' => $this->seo_title,
                'description' => $this->seo_description,
                'keywords' => $this->seo_keywords ?? [],
            ],
        ];
    }

    private function resolveLessonCount(): int
    {
        if (! array_key_exists('lessons_count', $this->resource->getAttributes())) {
            return (int) $this->lessons()->count();
        }

        return (int) ($this->lessons_count ?? 0);
    }

    /**
     * Sum of lesson.duration (seconds) → hours, 1 decimal.
     */
    private function resolveTotalDurationHours(): float
    {
        if (! array_key_exists('lessons_sum_duration', $this->resource->getAttributes())) {
            return round(((int) $this->lessons()->sum('duration')) / 3600, 1);
        }

        return round(((int) ($this->lessons_sum_duration ?? 0)) / 3600, 1);
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

    private function transientDate(string $key): ?string
    {
        $value = $this->getAttribute($key);

        if (blank($value)) {
            return null;
        }

        return $value instanceof \DateTimeInterface
            ? $value->format(DATE_ATOM)
            : (string) $value;
    }
}
