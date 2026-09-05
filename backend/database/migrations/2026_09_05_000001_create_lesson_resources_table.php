<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lesson_resources', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('lesson_id')->constrained('lessons')->cascadeOnDelete();
            $table->string('title', 200);
            // 'file' = uploaded/hosted asset, 'link' = external URL.
            $table->string('type', 20)->default('file');
            $table->string('url', 2048);
            $table->string('file_path', 2048)->nullable();
            // Human-readable size label for the admin/player UI (e.g. "2.4 MB").
            $table->string('file_size', 40)->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['lesson_id', 'sort_order']);
        });

        // Promote legacy JSON `pdf_resource_urls` into relational rows.
        $lessons = DB::table('lessons')
            ->whereNotNull('pdf_resource_urls')
            ->select(['id', 'pdf_resource_urls'])
            ->get();

        $now = now();

        foreach ($lessons as $lesson) {
            $raw = json_decode((string) $lesson->pdf_resource_urls, true);
            if (! is_array($raw) || $raw === []) {
                continue;
            }

            $rows = [];

            foreach (array_values($raw) as $index => $item) {
                if (is_string($item) && trim($item) !== '') {
                    $url = trim($item);
                    $path = parse_url($url, PHP_URL_PATH) ?: $url;
                    $ext = mb_strtolower(pathinfo($path, PATHINFO_EXTENSION) ?: 'file');
                    $title = basename($path) ?: 'Resource';
                    $type = str_starts_with($url, 'http://') || str_starts_with($url, 'https://')
                        ? 'link'
                        : 'file';

                    $rows[] = [
                        'lesson_id' => $lesson->id,
                        'title' => mb_substr($title, 0, 200),
                        'type' => $type,
                        'url' => mb_substr($url, 0, 2048),
                        'file_path' => $type === 'file' && ! str_starts_with($url, 'http') && ! str_starts_with($url, '/')
                            ? mb_substr($url, 0, 2048)
                            : null,
                        'file_size' => null,
                        'size_bytes' => null,
                        'sort_order' => $index,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];

                    continue;
                }

                if (! is_array($item)) {
                    continue;
                }

                $url = (string) ($item['url'] ?? $item['file_url'] ?? '');
                if ($url === '') {
                    continue;
                }

                $title = (string) ($item['title'] ?? $item['name'] ?? basename(parse_url($url, PHP_URL_PATH) ?: $url));
                $declaredType = (string) ($item['type'] ?? '');
                $sourceType = in_array($declaredType, ['file', 'link'], true)
                    ? $declaredType
                    : ((str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) ? 'link' : 'file');

                $sizeBytes = isset($item['size_bytes']) ? (int) $item['size_bytes'] : null;
                $fileSize = isset($item['file_size']) ? (string) $item['file_size'] : null;
                if ($fileSize === null && $sizeBytes !== null && $sizeBytes > 0) {
                    $fileSize = $this->formatBytes($sizeBytes);
                }

                $rows[] = [
                    'lesson_id' => $lesson->id,
                    'title' => mb_substr($title !== '' ? $title : 'Resource', 0, 200),
                    'type' => $sourceType,
                    'url' => mb_substr($url, 0, 2048),
                    'file_path' => isset($item['file_path']) ? mb_substr((string) $item['file_path'], 0, 2048) : null,
                    'file_size' => $fileSize !== null ? mb_substr($fileSize, 0, 40) : null,
                    'size_bytes' => $sizeBytes,
                    'sort_order' => $index,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if ($rows !== []) {
                DB::table('lesson_resources')->insert($rows);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_resources');
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes.' B';
        }

        if ($bytes < 1024 * 1024) {
            return round($bytes / 1024, 1).' KB';
        }

        return round($bytes / (1024 * 1024), 1).' MB';
    }
};
