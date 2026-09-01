<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property int $course_id
 * @property string $module_name
 * @property string|null $bunny_video_id Bunny Stream video GUID.
 * @property string|null $bunny_library_id Bunny Stream library ID.
 * @property int $duration Seconds.
 * @property array<int, mixed>|null $pdf_resource_urls
 */
class Lesson extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'course_id',
        'module_id',
        'module_name',
        'title',
        'video_url',
        'bunny_video_id',
        'bunny_library_id',
        'duration',
        'pdf_resource_urls',
        'is_locked',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'course_id' => 'integer',
            'module_id' => 'integer',
            'duration' => 'integer',
            'pdf_resource_urls' => 'array',
            'is_locked' => 'boolean',
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
     * @return BelongsTo<Module, $this>
     */
    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    /**
     * @param  Builder<Lesson>  $query
     */
    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }

    /**
     * Stable client-side grouping key derived from the module label, so the
     * sidebar can fold lessons into modules without a modules table.
     */
    public function moduleKey(): string
    {
        $slug = Str::slug($this->module_name);

        return $slug !== '' ? $slug : 'module-1';
    }
}
