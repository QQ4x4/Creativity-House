<?php

namespace App\Http\Resources;

use App\Models\Lesson;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin Lesson
 *
 * `is_completed` is a transient attribute set by CourseService from the student's
 * progress row — it is not a database column.
 */
class LessonResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'course_id' => $this->course_id,
            'module_id' => $this->moduleKey(),
            'module_name' => $this->module_name,
            'title' => $this->title,
            'video_url' => $this->video_url,
            'duration_seconds' => $this->duration,
            'resources' => $this->transformResources(),
            'completed' => (bool) ($this->getAttribute('is_completed') ?? false),
            'locked' => (bool) $this->is_locked,
            'order' => (int) $this->sort_order,
        ];
    }

    /**
     * Normalize `pdf_resource_urls` into the object shape the player expects.
     * Accepts either a plain list of URLs or a list of {title,url,type,size} maps,
     * so older seed data keeps working.
     *
     * @return list<array<string, mixed>>
     */
    private function transformResources(): array
    {
        $raw = is_array($this->pdf_resource_urls) ? $this->pdf_resource_urls : [];
        $resources = [];

        foreach ($raw as $index => $item) {
            if (is_string($item)) {
                $url = $item;
                $title = basename(parse_url($item, PHP_URL_PATH) ?: $item);
                $type = $this->extensionOf($url);
                $size = null;
            } elseif (is_array($item)) {
                $url = (string) ($item['url'] ?? $item['file_url'] ?? '');
                $title = (string) ($item['title'] ?? $item['name'] ?? basename($url));
                // Type comes from the URL, not the title — a title like "Slides"
                // has no extension to read.
                $type = (string) ($item['type'] ?? $this->extensionOf($url));
                $size = isset($item['size_bytes']) ? (int) $item['size_bytes'] : null;
            } else {
                continue;
            }

            if ($url === '') {
                continue;
            }

            $resources[] = [
                'id' => sprintf('%d-%d', $this->id, $index),
                'title' => $title,
                'url' => $this->resolveUrl($url),
                'type' => mb_strtolower($type),
                'size_bytes' => $size,
            ];
        }

        return $resources;
    }

    private function extensionOf(string $url): string
    {
        $path = parse_url($url, PHP_URL_PATH) ?: $url;

        return mb_strtolower(pathinfo($path, PATHINFO_EXTENSION) ?: 'file');
    }

    /**
     * Relative disk paths become public URLs; absolute URLs pass through.
     */
    private function resolveUrl(string $url): string
    {
        if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://') || str_starts_with($url, '/')) {
            return $url;
        }

        return Storage::disk('public')->url($url);
    }
}
