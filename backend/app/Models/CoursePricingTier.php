<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Per delivery-mode pricing for a course (Live / Recorded / Simulator).
 *
 * @property int $id
 * @property int $course_id
 * @property string $mode
 * @property float $price
 * @property float|null $original_price
 * @property int $duration_hours
 * @property array<int, string>|null $features_en
 * @property array<int, string>|null $features_ar
 */
class CoursePricingTier extends Model
{
    protected $table = 'course_pricing_tiers';

    protected $fillable = [
        'course_id',
        'mode',
        'price',
        'original_price',
        'duration_hours',
        'badge_text_en',
        'badge_text_ar',
        'features_en',
        'features_ar',
        'guarantee_title_en',
        'guarantee_title_ar',
        'guarantee_text_en',
        'guarantee_text_ar',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'course_id' => 'integer',
            'price' => 'decimal:2',
            'original_price' => 'decimal:2',
            'duration_hours' => 'integer',
            'features_en' => 'array',
            'features_ar' => 'array',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }
}
