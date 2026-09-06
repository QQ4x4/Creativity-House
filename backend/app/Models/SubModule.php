<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A chapter / section inside a Module. Lessons hang off SubModules so large
 * modules stay navigable in the admin editor and student sidebar.
 *
 * @property int $id
 * @property int $module_id
 * @property string $title_en
 * @property string|null $title_ar
 * @property int $sort_order
 */
class SubModule extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'module_id',
        'title_en',
        'title_ar',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'module_id' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Module, $this>
     */
    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    /**
     * @return HasMany<Lesson, $this>
     */
    public function lessons(): HasMany
    {
        return $this->hasMany(Lesson::class)->ordered();
    }

    /**
     * @param  Builder<SubModule>  $query
     */
    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }

    /**
     * Arabic falls back to English so UI never renders a blank chapter title.
     */
    public function title(string $locale = 'en'): string
    {
        if ($locale === 'ar') {
            return (string) ($this->title_ar ?: $this->title_en);
        }

        return (string) $this->title_en;
    }
}
