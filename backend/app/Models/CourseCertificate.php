<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Manual certificate award — independent of course progress / orders.
 *
 * @property int $id
 * @property int $user_id
 * @property int $course_id
 * @property \Illuminate\Support\Carbon $awarded_at
 * @property int|null $awarded_by_admin_id
 */
class CourseCertificate extends Model
{
    protected $fillable = [
        'user_id',
        'course_id',
        'awarded_at',
        'awarded_by_admin_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'course_id' => 'integer',
            'awarded_by_admin_id' => 'integer',
            'awarded_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function awardedByAdmin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'awarded_by_admin_id');
    }
}
