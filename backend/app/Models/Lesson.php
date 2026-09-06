<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
        'sub_module_id',
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
            'sub_module_id' => 'integer',
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
     * @return BelongsTo<SubModule, $this>
     */
    public function subModule(): BelongsTo
    {
        return $this->belongsTo(SubModule::class);
    }

    /**
     * Downloadable files and external links shown in the student Resources tab.
     *
     * @return HasMany<LessonResource, $this>
     */
    public function resources(): HasMany
    {
        return $this->hasMany(LessonResource::class)->orderBy('sort_order')->orderBy('id');
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

    /**
     * Stable client-side key for nesting lessons under a sub-module chapter.
     */
    public function subModuleKey(): string
    {
        $title = $this->relationLoaded('subModule') && $this->subModule
            ? $this->subModule->title_en
            : '';

        $slug = Str::slug($title);

        if ($slug !== '') {
            return $slug;
        }

        if ($this->sub_module_id) {
            return 'sub-module-'.$this->sub_module_id;
        }

        return 'default-section';
    }

    public function subModuleName(): string
    {
        if ($this->relationLoaded('subModule') && $this->subModule) {
            return (string) $this->subModule->title_en;
        }

        return 'Default Section';
    }
}
