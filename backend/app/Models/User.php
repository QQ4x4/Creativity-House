<?php

namespace App\Models;

use App\Enums\PaymentStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'first_name',
        'last_name',
        'name',
        'email',
        'phone_number',
        'avatar_url',
        'notification_preferences',
        'password',
        'google_id',
        'is_active',
        'email_verified_at',
        'verification_code',
        'code_expires_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'verification_code',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'code_expires_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'notification_preferences' => 'array',
        ];
    }

    /**
     * Default email notification opt-ins. Promotions stay off until the student
     * explicitly enables them.
     *
     * @var array<string, bool>
     */
    public const DEFAULT_NOTIFICATION_PREFERENCES = [
        'course_updates' => true,
        'new_certificates' => true,
        'promotional_announcements' => false,
    ];

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function hasVerifiedEmail(): bool
    {
        return $this->email_verified_at !== null;
    }

    public function markEmailAsVerified(): bool
    {
        return $this->forceFill([
            'email_verified_at' => $this->freshTimestamp(),
            'is_active' => true,
            'verification_code' => null,
            'code_expires_at' => null,
        ])->save();
    }

    /* ─── Student Portal (Phase 3) ──────────────────────────────────────── */

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
    public function courseProgress(): HasMany
    {
        return $this->hasMany(CourseProgress::class);
    }

    /**
     * Manual certificate awards (decoupled module).
     *
     * @return HasMany<CourseCertificate, $this>
     */
    public function courseCertificates(): HasMany
    {
        return $this->hasMany(CourseCertificate::class);
    }

    /**
     * Courses unlocked by a paid order, using `orders` as the pivot.
     *
     * @return BelongsToMany<Course, $this>
     */
    public function purchasedCourses(): BelongsToMany
    {
        return $this->belongsToMany(Course::class, 'orders', 'user_id', 'course_id')
            ->withPivot(['reference', 'payment_status', 'paid_at', 'created_at'])
            ->wherePivot('payment_status', PaymentStatus::Paid->value)
            ->wherePivotNull('deleted_at');
    }

    /**
     * Stored preferences merged over the defaults, so a partially-populated JSON
     * column can never produce a missing key downstream.
     *
     * @return array<string, bool>
     */
    public function notificationPreferences(): array
    {
        $stored = is_array($this->notification_preferences) ? $this->notification_preferences : [];

        $merged = [];
        foreach (self::DEFAULT_NOTIFICATION_PREFERENCES as $key => $default) {
            $merged[$key] = array_key_exists($key, $stored)
                ? filter_var($stored[$key], FILTER_VALIDATE_BOOLEAN)
                : $default;
        }

        return $merged;
    }

    /**
     * Public avatar URL. Absolute URLs (e.g. Google) pass through untouched;
     * relative disk paths are resolved against the public disk.
     */
    public function avatarUrl(): ?string
    {
        $value = $this->avatar_url;

        if (blank($value)) {
            return null;
        }

        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://')) {
            return $value;
        }

        return Storage::disk('public')->url($value);
    }
}
