<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Editable sub-module (chapter) with nested lessons for the curriculum builder.
 *
 * @mixin \App\Models\SubModule
 */
class AdminSubModuleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'module_id' => $this->module_id,
            'title_en' => $this->title_en,
            'title_ar' => $this->title_ar,
            'sort_order' => (int) $this->sort_order,
            'lessons' => AdminLessonResource::collection(
                $this->whenLoaded('lessons', fn () => $this->lessons, collect())
            ),
        ];
    }
}
