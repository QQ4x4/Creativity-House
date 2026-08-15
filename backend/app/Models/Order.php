<?php

namespace App\Models;

use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * A paid order is the enrollment record — course access is derived from it.
 *
 * @property int $id
 * @property string $reference
 * @property float $amount
 * @property PaymentStatus $payment_status
 */
class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'course_id',
        'reference',
        'amount',
        'currency',
        'payment_status',
        'invoice_path',
        'paid_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'course_id' => 'integer',
            'amount' => 'decimal:2',
            'payment_status' => PaymentStatus::class,
            'paid_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Order $order): void {
            if (blank($order->reference)) {
                $order->reference = self::generateReference();
            }
        });
    }

    /**
     * Sequential, human-readable reference (CH-2026-0001). Falls back to a random
     * suffix if a concurrent insert already took the next number.
     */
    public static function generateReference(): string
    {
        $year = now()->year;
        $count = (int) DB::table('orders')->whereYear('created_at', $year)->count();

        $candidate = sprintf('CH-%d-%04d', $year, $count + 1);

        if (DB::table('orders')->where('reference', $candidate)->exists()) {
            return sprintf('CH-%d-%s', $year, Str::upper(Str::random(6)));
        }

        return $candidate;
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
     * @param  Builder<Order>  $query
     */
    public function scopePaid(Builder $query): void
    {
        $query->where('payment_status', PaymentStatus::Paid->value);
    }

    public function grantsAccess(): bool
    {
        return $this->payment_status->grantsAccess();
    }
}
