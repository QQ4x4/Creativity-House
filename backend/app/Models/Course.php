<?php

namespace App\Models;

use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $title
 * @property string $slug
 * @property float $price
 * @property array<int, string>|null $seo_keywords
 */
class Course extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'slug',
        'description',
        'price',
        'currency',
        'cover_image',
        'total_hours',
        'instructor_name',
        'level',
        'is_published',
        'is_public',
        'sort_order',
        'seo_title',
        'seo_description',
        'seo_keywords',
        'title_en',
        'title_ar',
        'subtitle_en',
        'subtitle_ar',
        'description_en',
        'description_ar',
        'original_price',
        'badge',
        'badge_ar',
        'category',
        'rating',
        'students_count',
        'duration_label_en',
        'duration_label_ar',
        'language_en',
        'language_ar',
        'last_updated_at',
        'default_mode',
        'available_modes',
        'learning_outcomes',
        'curriculum',
        'target_audience',
        'catalog_modes',
        'instructor_bio_en',
        'instructor_bio_ar',
        'instructor_photo',
        'instructor_credentials',
        'schedule_en',
        'schedule_ar',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'total_hours' => 'decimal:2',
            'is_published' => 'boolean',
            'is_public' => 'boolean',
            'sort_order' => 'integer',
            'seo_keywords' => 'array',
            'original_price' => 'decimal:2',
            'rating' => 'decimal:2',
            'students_count' => 'integer',
            'last_updated_at' => 'date',
            'available_modes' => 'array',
            'learning_outcomes' => 'array',
            'curriculum' => 'array',
            'target_audience' => 'array',
            'catalog_modes' => 'array',
            'instructor_credentials' => 'array',
        ];
    }

    /* ─── Relations ─────────────────────────────────────────────────────── */

    /**
     * @return HasMany<Lesson, $this>
     */
    public function lessons(): HasMany
    {
        return $this->hasMany(Lesson::class)->ordered();
    }

    /**
     * @return HasMany<Order, $this>
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /**
     * @return HasMany<CourseProgress, $this>
     */
    public function progress(): HasMany
    {
        return $this->hasMany(CourseProgress::class);
    }

    /**
     * Progress row for one user — eager-loaded as `progressForUser` to keep the
     * "my courses" listing to a single query per relation (no N+1).
     *
     * @return HasOne<CourseProgress, $this>
     */
    public function progressForUser(): HasOne
    {
        return $this->hasOne(CourseProgress::class);
    }

    /* ─── Scopes ────────────────────────────────────────────────────────── */

    /**
     * @param  Builder<Course>  $query
     */
    public function scopePublished(Builder $query): void
    {
        $query->where('is_published', true);
    }

    /**
     * @param  Builder<Course>  $query
     */
    public function scopePublicCatalog(Builder $query): void
    {
        $query->where('is_published', true)->where('is_public', true);
    }

    /**
     * Courses the given user has a paid order for.
     *
     * @param  Builder<Course>  $query
     */
    public function scopePurchasedBy(Builder $query, int $userId): void
    {
        $query->whereHas('orders', function (Builder $orders) use ($userId): void {
            $orders->where('user_id', $userId)
                ->where('payment_status', PaymentStatus::Paid->value);
        });
    }

    /* ─── Routing ───────────────────────────────────────────────────────── */

    /**
     * Accept either a numeric id or a slug in route bindings, so
     * /courses/12/lessons and /courses/pm-foundations/lessons both resolve.
     */
    public function resolveRouteBinding($value, $field = null): ?Model
    {
        if ($field !== null) {
            return parent::resolveRouteBinding($value, $field);
        }

        return $this->newQuery()
            ->where(is_numeric($value) ? $this->getKeyName() : 'slug', $value)
            ->first();
    }
}
