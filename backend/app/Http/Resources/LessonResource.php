<?php

namespace App\Http\Resources;

use App\Models\Lesson;
use App\Models\LessonResource as LessonResourceModel;
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
            'sub_module_id' => $this->subModuleKey(),
            'sub_module_name' => $this->subModuleName(),
            'title' => $this->title,
            'video_url' => $this->video_url,
            'bunny_video_id' => $this->bunny_video_id,
            'bunny_library_id' => $this->bunny_library_id,
            'duration_seconds' => $this->duration,
            'resources' => $this->transformResources(),
            'completed' => (bool) ($this->getAttribute('is_completed') ?? false),
            'locked' => (bool) $this->is_locked,
            'order' => (int) $this->sort_order,
        ];
    }

    /**
     * Prefer the `lesson_resources` relation; fall back to legacy JSON.
     *
     * @return list<array<string, mixed>>
     */
    private function transformResources(): array
    {
        /** @var \Illuminate\Support\Collection<int, LessonResourceModel> $rows */
        $rows = $this->relationLoaded('resources')
            ? $this->resources
            : $this->resources()->get();

        if ($rows->isNotEmpty()) {
            return $rows->values()->map(function (LessonResourceModel $resource): array {
                return [
                    'id' => $resource->id,
                    'title' => $resource->title,
                    'url' => $resource->publicUrl(),
                    'type' => $resource->displayType(),
                    'size_bytes' => $resource->size_bytes,
                    'file_size' => $resource->file_size,
                    'source_type' => $resource->type,
                ];
            })->all();
        }

        return $this->transformLegacyJson();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function transformLegacyJson(): array
    {
        $raw = is_array($this->pdf_resource_urls) ? $this->pdf_resource_urls : [];
        $resources = [];

        foreach ($raw as $index => $item) {
            if (is_string($item)) {
                $url = $item;
                $title = basename(parse_url($item, PHP_URL_PATH) ?: $item);
                $type = $this->extensionOf($url);
                $size = null;
                $fileSize = null;
            } elseif (is_array($item)) {
                $url = (string) ($item['url'] ?? $item['file_url'] ?? '');
                $title = (string) ($item['title'] ?? $item['name'] ?? basename($url));
                $type = (string) ($item['type'] ?? $this->extensionOf($url));
                $size = isset($item['size_bytes']) ? (int) $item['size_bytes'] : null;
                $fileSize = isset($item['file_size']) ? (string) $item['file_size'] : null;
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
                'file_size' => $fileSize,
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
