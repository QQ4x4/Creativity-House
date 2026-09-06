<?php

namespace App\Http\Resources\Admin;

use App\Models\LessonResource as LessonResourceModel;
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
        $resources = $this->mappedResources();

        return [
            'id' => $this->id,
            'module_id' => $this->module_id,
            'sub_module_id' => $this->sub_module_id,
            'title' => $this->title,
            'video_url' => $this->video_url,
            'bunny_video_id' => $this->bunny_video_id,
            'bunny_library_id' => $this->bunny_library_id,
            'duration' => (int) $this->duration,
            'is_locked' => (bool) $this->is_locked,
            'sort_order' => (int) $this->sort_order,
            'resources' => $resources,
            // Legacy mirror — kept so older clients still hydrate.
            'pdf_resource_urls' => array_values(array_map(
                static fn (array $resource): string => (string) $resource['url'],
                $resources
            )),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function mappedResources(): array
    {
        if ($this->relationLoaded('resources')) {
            return $this->resources->values()->map(function (LessonResourceModel $resource): array {
                return [
                    'id' => $resource->id,
                    'title' => $resource->title,
                    'type' => $resource->type,
                    'url' => $resource->publicUrl(),
                    'file_path' => $resource->file_path,
                    'file_size' => $resource->file_size,
                    'size_bytes' => $resource->size_bytes,
                    'sort_order' => $resource->sort_order,
                ];
            })->all();
        }

        $raw = is_array($this->pdf_resource_urls) ? $this->pdf_resource_urls : [];
        $out = [];

        foreach (array_values($raw) as $index => $item) {
            if (is_string($item) && $item !== '') {
                $out[] = [
                    'id' => null,
                    'title' => basename(parse_url($item, PHP_URL_PATH) ?: $item) ?: 'Resource',
                    'type' => str_starts_with($item, 'http') ? 'link' : 'file',
                    'url' => $item,
                    'file_path' => null,
                    'file_size' => null,
                    'size_bytes' => null,
                    'sort_order' => $index,
                ];

                continue;
            }

            if (! is_array($item)) {
                continue;
            }

            $url = (string) ($item['url'] ?? '');
            if ($url === '') {
                continue;
            }

            $out[] = [
                'id' => isset($item['id']) ? (int) $item['id'] : null,
                'title' => (string) ($item['title'] ?? 'Resource'),
                'type' => in_array(($item['source_type'] ?? $item['type'] ?? 'file'), ['file', 'link'], true)
                    ? (string) ($item['source_type'] ?? $item['type'])
                    : (str_starts_with($url, 'http') ? 'link' : 'file'),
                'url' => $url,
                'file_path' => $item['file_path'] ?? null,
                'file_size' => $item['file_size'] ?? null,
                'size_bytes' => isset($item['size_bytes']) ? (int) $item['size_bytes'] : null,
                'sort_order' => $index,
            ];
        }

        return $out;
    }
}
