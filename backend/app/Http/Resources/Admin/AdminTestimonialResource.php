<?php

namespace App\Http\Resources\Admin;

use App\Services\Bunny\BunnyStreamService;
use App\Support\PublicMediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Testimonial */
class AdminTestimonialResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $customThumb = PublicMediaUrl::resolve($this->custom_thumbnail_path);
        $bunnyThumb = app(BunnyStreamService::class)->thumbnailUrl((string) $this->bunny_video_id);
        $thumbnailUrl = $customThumb ?: $bunnyThumb;

        return [
            'id' => (int) $this->id,
            'bunny_video_id' => $this->bunny_video_id,
            'bunny_collection_id' => $this->bunny_collection_id,
            'video_title' => $this->video_title,
            'duration_seconds' => (int) $this->duration_seconds,
            'orientation' => $this->orientation,
            'person_name_en' => $this->person_name_en,
            'person_name_ar' => $this->person_name_ar,
            'person_role_en' => $this->person_role_en,
            'person_role_ar' => $this->person_role_ar,
            'country' => $this->country,
            'course_id' => $this->course_id !== null ? (int) $this->course_id : null,
            'course' => $this->whenLoaded('course', function () {
                if ($this->course === null) {
                    return null;
                }

                return [
                    'id' => (int) $this->course->id,
                    'title_en' => $this->course->title_en ?? $this->course->title,
                    'title_ar' => $this->course->title_ar ?? null,
                    'slug' => $this->course->slug,
                ];
            }),
            'caption_en' => $this->caption_en,
            'caption_ar' => $this->caption_ar,
            'quote_en' => $this->quote_en,
            'quote_ar' => $this->quote_ar,
            'custom_thumbnail_path' => $this->custom_thumbnail_path,
            'custom_thumbnail_url' => $customThumb,
            'thumbnail_url' => $thumbnailUrl,
            'embed_url' => app(BunnyStreamService::class)->signedEmbedUrl(
                (string) $this->bunny_video_id,
                false
            ),
            'is_featured' => (bool) $this->is_featured,
            'is_published' => (bool) $this->is_published,
            'position' => (int) $this->position,
            'created_at' => optional($this->created_at)?->toIso8601String(),
            'updated_at' => optional($this->updated_at)?->toIso8601String(),
        ];
    }
}
