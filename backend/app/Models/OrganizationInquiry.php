<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $name
 * @property string $company_name
 * @property string $email
 * @property string $phone
 * @property int|null $course_id
 * @property string $message
 * @property string $status
 */
class OrganizationInquiry extends Model
{
    protected $fillable = [
        'name',
        'company_name',
        'email',
        'phone',
        'course_id',
        'message',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'course_id' => 'integer',
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
