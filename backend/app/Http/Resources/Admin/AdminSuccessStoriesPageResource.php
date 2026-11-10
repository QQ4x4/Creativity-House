<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\SuccessStoriesPage */
class AdminSuccessStoriesPageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'hero_title_en' => $this->hero_title_en,
            'hero_title_ar' => $this->hero_title_ar,
            'hero_subtitle_en' => $this->hero_subtitle_en,
            'hero_subtitle_ar' => $this->hero_subtitle_ar,
            'cta_title_en' => $this->cta_title_en,
            'cta_title_ar' => $this->cta_title_ar,
            'cta_button_en' => $this->cta_button_en,
            'cta_button_ar' => $this->cta_button_ar,
            'cta_link' => $this->cta_link ?: '/courses',
        ];
    }
}
