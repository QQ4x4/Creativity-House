<?php

namespace App\Jobs;

use App\Services\GoogleDataManagerService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

/**
 * Async Google Ads Data Manager conversion so form / auth responses stay fast.
 */
class SendGoogleAdsConversion implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /**
     * @param  array{email?: string|null, phone?: string|null}  $userData
     * @param  array{gclid?: string|null, gbraid?: string|null, wbraid?: string|null}  $adIdentifiers
     */
    public function __construct(
        public string $transactionId,
        public array $userData = [],
        public array $adIdentifiers = [],
        public ?string $conversionActionId = null,
        public ?float $conversionValue = null,
        public string $currency = 'USD',
    ) {}

    public function handle(GoogleDataManagerService $googleAds): void
    {
        try {
            $googleAds->sendConversion(
                $this->transactionId,
                $this->userData,
                $this->adIdentifiers,
                $this->conversionActionId,
                $this->conversionValue,
                $this->currency,
            );
        } catch (Throwable) {
            // Service already logs; never bubble into the queue worker crash path.
        }
    }
}
