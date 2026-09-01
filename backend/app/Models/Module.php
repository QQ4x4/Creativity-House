<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A curriculum module. Single source of truth for both the student player
 * sidebar and the public course page syllabus preview.
 *
 * @property int $id
 * @property int $course_id
 * @property string $title_en
 * @property string|null $title_ar
 * @property int $sort_order
 */
class Module extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'course_id',
        'title_en',
        'title_ar',
        'duration_label_en',
        'duration_label_ar',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'course_id' => 'integer',
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

    /**
     * @return HasMany<Lesson, $this>
     */
    public function lessons(): HasMany
    {
        return $this->hasMany(Lesson::class)->ordered();
    }

    /**
     * @param  Builder<Module>  $query
     */
    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }

    /**
     * Arabic falls back to English so the public page never renders blanks.
     */
    public function title(string $locale = 'en'): string
    {
        if ($locale === 'ar') {
            return (string) ($this->title_ar ?: $this->title_en);
        }

        return (string) $this->title_en;
    }
}
