<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GhlSyncLog extends Model
{
    protected $fillable = [
        'entity_type',
        'entity_id',
        'action',
        'status',
        'http_status',
        'ghl_id',
        'error',
        'attempts',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'http_status' => 'integer',
            'attempts' => 'integer',
        ];
    }
}
