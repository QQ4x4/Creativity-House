<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Raw editable module row, with nested sub-modules (and a flattened lessons
 * mirror for older clients).
 *
 * @mixin \App\Models\Module
 */
class AdminModuleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $subModules = $this->whenLoaded(
            'subModules',
            fn () => $this->subModules,
            collect()
        );

        $flattenedLessons = $subModules->isNotEmpty()
            ? $subModules->flatMap(fn ($subModule) => $subModule->relationLoaded('lessons')
                ? $subModule->lessons
                : collect())
            : ($this->relationLoaded('lessons') ? $this->lessons : collect());

        return [
            'id' => $this->id,
            'title_en' => $this->title_en,
            'title_ar' => $this->title_ar,
            'duration_label_en' => $this->duration_label_en,
            'duration_label_ar' => $this->duration_label_ar,
            'sort_order' => (int) $this->sort_order,
            'sub_modules' => AdminSubModuleResource::collection($subModules),
            // BC: older editors still expect modules[].lessons.
            'lessons' => AdminLessonResource::collection($flattenedLessons),
        ];
    }
}
