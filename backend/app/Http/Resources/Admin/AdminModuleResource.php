<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Raw editable module row, with its lessons nested for the builder tree.
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
        return [
            'id' => $this->id,
            'title_en' => $this->title_en,
            'title_ar' => $this->title_ar,
            'duration_label_en' => $this->duration_label_en,
            'duration_label_ar' => $this->duration_label_ar,
            'sort_order' => (int) $this->sort_order,
            'lessons' => AdminLessonResource::collection(
                $this->whenLoaded('lessons', fn () => $this->lessons, collect())
            ),
        ];
    }
}
