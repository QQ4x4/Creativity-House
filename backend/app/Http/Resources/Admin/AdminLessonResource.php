<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Raw editable lesson row for the admin curriculum builder.
 *
 * @mixin \App\Models\Lesson
 */
class AdminLessonResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'module_id' => $this->module_id,
            'title' => $this->title,
            'video_url' => $this->video_url,
            'bunny_video_id' => $this->bunny_video_id,
            'bunny_library_id' => $this->bunny_library_id,
            'duration' => (int) $this->duration,
            'is_locked' => (bool) $this->is_locked,
            'sort_order' => (int) $this->sort_order,
            'pdf_resource_urls' => $this->pdf_resource_urls ?? [],
        ];
    }
}
