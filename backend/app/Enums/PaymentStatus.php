<?php

namespace App\Enums;

/**
 * Order payment lifecycle. A `Paid` order is what grants course access, so this
 * enum is the single authority on enrollment — never compare raw strings.
 */
enum PaymentStatus: string
{
    case Pending = 'pending';
    case Paid = 'paid';
    case Refunded = 'refunded';
    case Failed = 'failed';

    public function grantsAccess(): bool
    {
        return $this === self::Paid;
    }

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Paid => 'Paid',
            self::Refunded => 'Refunded',
            self::Failed => 'Failed',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $status): string => $status->value, self::cases());
    }
}
