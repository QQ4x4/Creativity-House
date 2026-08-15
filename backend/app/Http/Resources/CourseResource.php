<?php

namespace App\Http\Resources;

use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin Course
 *
 * `enrolled_at` and `next_lesson_id` are transient attributes set by
 * CourseService (they belong to the student↔course pairing, not the course row).
 */
class CourseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $lessonsCount = (int) ($this->lessons_count ?? $this->lessons()->count());

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
            'total_hours' => (float) $this->total_hours,
            'total_lessons' => $lessonsCount,

            'enrolled_at' => $this->transientDate('enrolled_at'),
            'certificate_earned' => $this->certificateEarned(),
            'next_lesson_id' => $this->getAttribute('next_lesson_id'),

            'progress' => $this->whenLoaded(
                'progressForUser',
                fn () => $this->progressForUser
                    ? (new ProgressResource($this->progressForUser))->withTotalLessons($lessonsCount)
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

    /**
     * A certificate is earned once the student's progress reaches 100%.
     */
    private function certificateEarned(): bool
    {
        return $this->relationLoaded('progressForUser')
            && $this->progressForUser !== null
            && $this->progressForUser->isComplete();
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
