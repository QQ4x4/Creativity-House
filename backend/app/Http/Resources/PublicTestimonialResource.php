<?php

namespace App\Http\Resources;

use App\Services\Bunny\BunnyStreamService;
use App\Support\PublicMediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Testimonial */
class PublicTestimonialResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var BunnyStreamService $bunny */
        $bunny = app(BunnyStreamService::class);

        $customThumb = PublicMediaUrl::resolve($this->custom_thumbnail_path);
        $bunnyThumb = $bunny->thumbnailUrl((string) $this->bunny_video_id);
        $thumbnailUrl = $customThumb ?: $bunnyThumb;

        $lang = strtolower(substr((string) $request->query('lang', $request->header('Accept-Language', 'en')), 0, 2));
        $isAr = $lang === 'ar';

        $personName = $isAr
            ? ($this->person_name_ar ?: $this->person_name_en)
            : ($this->person_name_en ?: $this->person_name_ar);
        $personRole = $isAr
            ? ($this->person_role_ar ?: $this->person_role_en)
            : ($this->person_role_en ?: $this->person_role_ar);
        $caption = $isAr
            ? ($this->caption_ar ?: $this->caption_en)
            : ($this->caption_en ?: $this->caption_ar);
        $quote = $isAr
            ? ($this->quote_ar ?: $this->quote_en)
            : ($this->quote_en ?: $this->quote_ar);

        $course = null;
        if ($this->relationLoaded('course') && $this->course) {
            $courseTitle = $isAr
                ? ($this->course->title_ar ?: $this->course->title_en ?: $this->course->title)
                : ($this->course->title_en ?: $this->course->title_ar ?: $this->course->title);
            $course = [
                'id' => (int) $this->course->id,
                'slug' => $this->course->slug,
                'title' => $courseTitle,
            ];
        }

        return [
            'id' => (int) $this->id,
            'bunny_video_id' => $this->bunny_video_id,
            'video_title' => $this->video_title,
            'duration_seconds' => (int) $this->duration_seconds,
            'orientation' => $this->orientation,
            'person_name' => $personName,
            'person_role' => $personRole,
            'person_name_en' => $this->person_name_en,
            'person_name_ar' => $this->person_name_ar,
            'person_role_en' => $this->person_role_en,
            'person_role_ar' => $this->person_role_ar,
            'country' => $this->country,
            'caption' => $caption,
            'caption_en' => $this->caption_en,
            'caption_ar' => $this->caption_ar,
            'quote' => $quote,
            'quote_en' => $this->quote_en,
            'quote_ar' => $this->quote_ar,
            'course' => $course,
            'is_featured' => (bool) $this->is_featured,
            'position' => (int) $this->position,
            'thumbnail_url' => $thumbnailUrl,
            'embed_url' => $bunny->signedEmbedUrl((string) $this->bunny_video_id, false),
            'embed_url_autoplay' => $bunny->signedEmbedUrl((string) $this->bunny_video_id, true),
            'created_at' => optional($this->created_at)?->toIso8601String(),
            'updated_at' => optional($this->updated_at)?->toIso8601String(),
        ];
    }
}
