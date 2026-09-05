<?php

namespace App\Services\Admin;

use App\Models\Lesson;
use App\Models\LessonResource;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Stores lesson attachment uploads on the public disk and returns the
 * metadata the admin curriculum editor embeds in the sync payload.
 */
class LessonResourceUploadService
{
    private const DIRECTORY = 'lesson-resources';

    private const DISK = 'public';

    private const MAX_BYTES = 50 * 1024 * 1024;

    /** @var list<string> */
    public const ALLOWED_EXTENSIONS = [
        'ogg', 'oga', 'mp3', 'wav', 'm4a', 'aac', 'flac',
        'pdf', 'doc', 'docx', 'zip', 'rar',
        'xlsx', 'xls', 'png', 'jpg', 'jpeg', 'webp',
    ];

    /**
     * @return array{
     *   title: string,
     *   type: string,
     *   url: string,
     *   file_path: string,
     *   file_size: string,
     *   size_bytes: int
     * }
     */
    public function store(UploadedFile $file, ?string $title = null): array
    {
        $extension = mb_strtolower($file->getClientOriginalExtension() ?: 'bin');

        if (! in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            throw new RuntimeException('That file type is not allowed for lesson resources.');
        }

        if ($file->getSize() !== null && $file->getSize() > self::MAX_BYTES) {
            throw new RuntimeException('Lesson resources must be 50 MB or smaller.');
        }

        $filename = sprintf('%s.%s', Str::uuid()->toString(), $extension);
        $path = $file->storeAs(self::DIRECTORY, $filename, self::DISK);

        if ($path === false) {
            throw new RuntimeException('Unable to store the uploaded resource.');
        }

        $bytes = (int) ($file->getSize() ?? 0);
        $originalName = pathinfo((string) $file->getClientOriginalName(), PATHINFO_FILENAME);
        $resolvedTitle = trim((string) ($title ?: $originalName)) ?: 'Resource';

        return [
            'title' => mb_substr($resolvedTitle, 0, 200),
            'type' => LessonResource::TYPE_FILE,
            'url' => Storage::disk(self::DISK)->url($path),
            'file_path' => $path,
            'file_size' => $this->formatBytes($bytes),
            'size_bytes' => $bytes,
        ];
    }

    /**
     * Replace a lesson's resource rows and mirror them into `pdf_resource_urls`
     * so older readers keep working until fully migrated.
     *
     * @param  list<array<string, mixed>>  $resources
     */
    public function syncForLesson(Lesson $lesson, array $resources): void
    {
        $keptIds = [];
        $mirror = [];

        foreach (array_values($resources) as $index => $payload) {
            if (! is_array($payload)) {
                continue;
            }

            $url = trim((string) ($payload['url'] ?? ''));
            $title = trim((string) ($payload['title'] ?? ''));

            if ($url === '' || $title === '') {
                continue;
            }

            $type = (string) ($payload['type'] ?? LessonResource::TYPE_FILE);
            if (! in_array($type, [LessonResource::TYPE_FILE, LessonResource::TYPE_LINK], true)) {
                $type = str_starts_with($url, 'http://') || str_starts_with($url, 'https://')
                    ? LessonResource::TYPE_LINK
                    : LessonResource::TYPE_FILE;
            }

            $sizeBytes = isset($payload['size_bytes']) && $payload['size_bytes'] !== null
                ? (int) $payload['size_bytes']
                : null;
            $fileSize = isset($payload['file_size']) && $payload['file_size'] !== null
                ? (string) $payload['file_size']
                : ($sizeBytes !== null ? $this->formatBytes($sizeBytes) : null);

            $attributes = [
                'title' => mb_substr($title, 0, 200),
                'type' => $type,
                'url' => mb_substr($url, 0, 2048),
                'file_path' => isset($payload['file_path']) && $payload['file_path'] !== null
                    ? mb_substr((string) $payload['file_path'], 0, 2048)
                    : null,
                'file_size' => $fileSize !== null ? mb_substr($fileSize, 0, 40) : null,
                'size_bytes' => $sizeBytes,
                'sort_order' => $index,
            ];

            $id = $payload['id'] ?? null;
            $existing = null;

            if ($id !== null) {
                $existing = $lesson->resources()->whereKey((int) $id)->first();
            }

            if ($existing) {
                $existing->update($attributes);
                $resource = $existing;
            } else {
                $resource = $lesson->resources()->create($attributes);
            }

            $keptIds[] = $resource->id;

            $mirror[] = [
                'title' => $resource->title,
                'url' => $resource->url,
                'type' => $resource->displayType(),
                'size_bytes' => $resource->size_bytes,
                'file_size' => $resource->file_size,
                'file_path' => $resource->file_path,
                'source_type' => $resource->type,
            ];
        }

        if ($keptIds === []) {
            $lesson->resources()->delete();
        } else {
            $lesson->resources()->whereNotIn('id', $keptIds)->delete();
        }

        $lesson->forceFill(['pdf_resource_urls' => $mirror])->save();
    }

    public function formatBytes(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes.' B';
        }

        if ($bytes < 1024 * 1024) {
            return round($bytes / 1024, 1).' KB';
        }

        return round($bytes / (1024 * 1024), 1).' MB';
    }
}
