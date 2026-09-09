<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Inquiry extends Model
{
    public const TYPE_USER = 'user';

    public const TYPE_ORGANIZATION = 'organization';

    public const STATUS_UNREAD = 'unread';

    public const STATUS_READ = 'read';

    public const STATUS_REPLIED = 'replied';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'type',
        'full_name',
        'email',
        'phone_number',
        'company_name',
        'target_course',
        'message',
        'status',
        'replied_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'replied_at' => 'datetime',
        ];
    }

    public function scopeOfType(Builder $query, ?string $type): Builder
    {
        if ($type === null || $type === '' || $type === 'all') {
            return $query;
        }

        return $query->where('type', $type);
    }

    public function scopeOfStatus(Builder $query, ?string $status): Builder
    {
        if ($status === null || $status === '' || $status === 'all') {
            return $query;
        }

        return $query->where('status', $status);
    }

    public function markReadIfUnread(): void
    {
        if ($this->status === self::STATUS_UNREAD) {
            $this->forceFill(['status' => self::STATUS_READ])->save();
        }
    }
}
