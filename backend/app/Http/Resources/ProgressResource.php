<?php

namespace App\Http\Resources;

use App\Models\CourseProgress;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CourseProgress
 *
 * `total_lessons` is the live lesson count, injected by ProgressService via
 * `withTotalLessons()` so the percentage denominator is never stale.
 */
class ProgressResource extends JsonResource
{
    private ?int $totalLessons = null;

    public function withTotalLessons(?int $totalLessons): self
    {
        $this->totalLessons = $totalLessons;

        return $this;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'course_id' => $this->course_id,
            // Never falls back to `$this->course->...` — that would lazy-load a
            // relation per row and reintroduce an N+1 in the courses listing.
            'total_lessons' => $this->totalLessons ?? (int) ($this->getAttribute('total_lessons') ?? 0),
            'completed_lessons' => $this->completedLessonIds(),
            'completion_percentage' => $this->completion_percentage,
            'total_learning_seconds' => $this->total_learning_seconds,
            'last_lesson_id' => $this->last_lesson_id,
            'completed_at' => $this->completed_at?->toISOString(),
        ];
    }
}
