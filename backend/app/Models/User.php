<?php

namespace App\Models;

use App\Enums\PaymentStatus;
use Database\Factories\UserFactory;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements FilamentUser
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
        'avatar',
        'notification_preferences',
        'password',
        'google_id',
        'is_active',
        'is_admin',
        'email_verified_at',
        'verification_code',
        'code_expires_at',
    ];

    /**
     * Always include the absolute public avatar URL in JSON responses.
     *
     * @var list<string>
     */
    protected $appends = [
        'avatar_url',
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
        // Relative disk path — clients must use `avatar_url` only.
        'avatar',
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
            'is_admin' => 'boolean',
            'notification_preferences' => 'array',
        ];
    }

    /**
     * Single authority for admin access, used by both the `admin` API
     * middleware and the Filament panel.
     */
    public function isAdmin(): bool
    {
        return (bool) $this->is_admin && (bool) $this->is_active;
    }

    /**
     * Filament previously let any authenticated user into /admin.
     */
    public function canAccessPanel(Panel $panel): bool
    {
        return $this->isAdmin();
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
     * Absolute public avatar URL (appended as `avatar_url`).
     * DB column `avatar` stores a relative public-disk path (e.g. avatars/1-abc.jpg).
     */
    public function getAvatarUrlAttribute(): ?string
    {
        return $this->resolveAvatarUrl();
    }

    /**
     * Public helper used by API resources / auth payloads.
     */
    public function avatarUrl(): ?string
    {
        return $this->resolveAvatarUrl();
    }

    /**
     * Resolve the absolute avatar URL from the stored path (or absolute URL).
     * Relative Storage URLs are forced through `url()` so Next.js never gets
     * a host-relative `/storage/...` that resolves against the frontend origin.
     */
    private function resolveAvatarUrl(): ?string
    {
        $value = $this->attributes['avatar'] ?? null;

        if (blank($value)) {
            return null;
        }

        $value = (string) $value;

        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://')) {
            return $value;
        }

        $storageUrl = Storage::disk('public')->url($value);

        if (str_starts_with($storageUrl, 'http://') || str_starts_with($storageUrl, 'https://')) {
            return $storageUrl;
        }

        return url($storageUrl);
    }
}
