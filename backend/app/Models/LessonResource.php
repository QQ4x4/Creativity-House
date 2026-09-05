<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * Downloadable file or external link attached to a lesson.
 *
 * @property int $id
 * @property int $lesson_id
 * @property string $title
 * @property string $type  file|link
 * @property string $url
 * @property string|null $file_path
 * @property string|null $file_size
 * @property int|null $size_bytes
 * @property int $sort_order
 */
class LessonResource extends Model
{
    use HasFactory;

    public const TYPE_FILE = 'file';

    public const TYPE_LINK = 'link';

    protected $table = 'lesson_resources';

    protected $fillable = [
        'lesson_id',
        'title',
        'type',
        'url',
        'file_path',
        'file_size',
        'size_bytes',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'lesson_id' => 'integer',
            'size_bytes' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Lesson, $this>
     */
    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    /**
     * Public URL the student player can open/download.
     */
    public function publicUrl(): string
    {
        $url = (string) $this->url;

        if ($url !== '' && (
            str_starts_with($url, 'http://')
            || str_starts_with($url, 'https://')
            || str_starts_with($url, '/')
        )) {
            return $url;
        }

        $path = (string) ($this->file_path ?: $url);
        if ($path === '') {
            return '';
        }

        return Storage::disk('public')->url($path);
    }

    /**
     * File extension / media kind for player icons (pdf, zip, mp3, link, …).
     */
    public function displayType(): string
    {
        if ($this->type === self::TYPE_LINK) {
            $ext = $this->extensionFromUrl($this->url);
            return $ext !== '' ? $ext : 'link';
        }

        $fromPath = $this->extensionFromUrl((string) ($this->file_path ?: $this->url));

        return $fromPath !== '' ? $fromPath : 'file';
    }

    private function extensionFromUrl(string $url): string
    {
        $path = parse_url($url, PHP_URL_PATH) ?: $url;

        return mb_strtolower(pathinfo($path, PATHINFO_EXTENSION) ?: '');
    }
}
