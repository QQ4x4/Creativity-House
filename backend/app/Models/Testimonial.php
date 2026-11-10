<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $bunny_video_id
 * @property string|null $bunny_collection_id
 * @property string|null $video_title
 * @property int $duration_seconds
 * @property string $orientation
 * @property string|null $person_name_en
 * @property string|null $person_name_ar
 * @property string|null $person_role_en
 * @property string|null $person_role_ar
 * @property string|null $country
 * @property int|null $course_id
 * @property string|null $caption_en
 * @property string|null $caption_ar
 * @property string|null $quote_en
 * @property string|null $quote_ar
 * @property string|null $custom_thumbnail_path
 * @property bool $is_featured
 * @property bool $is_published
 * @property int $position
 */
class Testimonial extends Model
{
    use HasFactory;

    public const ORIENTATION_LANDSCAPE = 'landscape';

    public const ORIENTATION_PORTRAIT = 'portrait';

    protected $fillable = [
        'bunny_video_id',
        'bunny_collection_id',
        'video_title',
        'duration_seconds',
        'orientation',
        'person_name_en',
        'person_name_ar',
        'person_role_en',
        'person_role_ar',
        'country',
        'course_id',
        'caption_en',
        'caption_ar',
        'quote_en',
        'quote_ar',
        'custom_thumbnail_path',
        'is_featured',
        'is_published',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'duration_seconds' => 'integer',
            'course_id' => 'integer',
            'is_featured' => 'boolean',
            'is_published' => 'boolean',
            'position' => 'integer',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * Ensure only one featured testimonial exists.
     */
    public function markFeatured(): void
    {
        static::query()
            ->where('id', '!=', $this->id)
            ->where('is_featured', true)
            ->update(['is_featured' => false]);

        $this->forceFill(['is_featured' => true])->save();
    }
}
