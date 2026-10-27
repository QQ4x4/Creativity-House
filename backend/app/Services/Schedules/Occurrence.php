<?php

namespace App\Services\Schedules;

use Carbon\CarbonImmutable;

/**
 * One generated batch (one public schedule card). Immutable value object —
 * nothing here is persisted; ScheduleOccurrenceService rebuilds it on read.
 */
final class Occurrence
{
    public const STATUS_OPEN = 'open';

    public const STATUS_FEW_SEATS = 'few_seats';

    public const STATUS_SOLD_OUT = 'sold_out';

    public const STATUS_CLOSED = 'closed';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_STARTED = 'started';

    public const STATUS_ENDED = 'ended';

    /** Statuses that still allow a buyer through checkout. */
    private const BOOKABLE = [self::STATUS_OPEN, self::STATUS_FEW_SEATS];

    /**
     * @param  array{name_en: ?string, name_ar: ?string, title_en: ?string, title_ar: ?string, photo: ?string}  $trainer
     * @param  array{name_en: ?string, name_ar: ?string, photo: ?string}|null  $trainerOverride
     */
    public function __construct(
        public readonly int $scheduleId,
        public readonly string $occurrenceDate,
        public readonly CarbonImmutable $startAt,
        public readonly CarbonImmutable $endAt,
        public readonly string $timezone,
        public readonly string $utcOffsetLabel,
        public readonly string $localStartDate,
        public readonly string $localEndDate,
        public readonly string $startTime,
        public readonly string $endTime,
        public readonly int $durationDays,
        public readonly string $timeSlot,
        public readonly string $format,
        public readonly ?string $locationEn,
        public readonly ?string $locationAr,
        public readonly ?int $batchNumber,
        public readonly ?int $batchNumberOverride,
        public readonly ?string $titleEn,
        public readonly ?string $titleAr,
        public readonly ?string $deliveryMode,
        public readonly float $price,
        public readonly ?float $originalPrice,
        public readonly string $currency,
        public readonly ?int $discountPercent,
        public readonly ?string $promoTextEn,
        public readonly ?string $promoTextAr,
        public readonly ?int $seatsTotal,
        public readonly ?int $seatsLeft,
        public readonly int $seatsTaken,
        public readonly bool $showSeatsLeft,
        public readonly string $status,
        public readonly string $ctaType,
        public readonly bool $showCountdown,
        public readonly bool $isFeatured,
        public readonly array $trainer,
        public readonly ?array $trainerOverride,
        public readonly ?string $noteEn,
        public readonly ?string $noteAr,
        public readonly bool $isException,
    ) {}

    public function isBookable(): bool
    {
        return in_array($this->status, self::BOOKABLE, true);
    }

    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }

    /**
     * Public JSON shape (snake_case), shared by the course page and checkout.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'schedule_id' => $this->scheduleId,
            'occurrence_date' => $this->occurrenceDate,
            'start_at' => $this->startAt->toIso8601ZuluString(),
            'end_at' => $this->endAt->toIso8601ZuluString(),
            'timezone' => $this->timezone,
            'utc_offset_label' => $this->utcOffsetLabel,
            'local_start_date' => $this->localStartDate,
            'local_end_date' => $this->localEndDate,
            'start_time' => $this->startTime,
            'end_time' => $this->endTime,
            'duration_days' => $this->durationDays,
            'time_slot' => $this->timeSlot,
            'format' => $this->format,
            'location_en' => $this->locationEn,
            'location_ar' => $this->locationAr,
            'batch_number' => $this->batchNumber,
            'title_en' => $this->titleEn,
            'title_ar' => $this->titleAr,
            'delivery_mode' => $this->deliveryMode,
            'price' => $this->price,
            'original_price' => $this->originalPrice,
            'currency' => $this->currency,
            'discount_percent' => $this->discountPercent,
            'promo_text_en' => $this->promoTextEn,
            'promo_text_ar' => $this->promoTextAr,
            'seats_total' => $this->seatsTotal,
            'seats_left' => $this->seatsLeft,
            'show_seats_left' => $this->showSeatsLeft,
            'status' => $this->status,
            'is_bookable' => $this->isBookable(),
            'cta_type' => $this->ctaType,
            'show_countdown' => $this->showCountdown,
            'is_featured' => $this->isFeatured,
            'trainer' => $this->trainer,
            'note_en' => $this->noteEn,
            'note_ar' => $this->noteAr,
            'is_exception' => $this->isException,
        ];
    }

    /**
     * Admin view — adds seats sold + raw batch override (blank = use series).
     *
     * @return array<string, mixed>
     */
    public function toAdminArray(): array
    {
        return $this->toArray() + [
            'seats_taken' => $this->seatsTaken,
            'batch_number_override' => $this->batchNumberOverride,
            'trainer_override' => $this->trainerOverride,
        ];
    }
}
