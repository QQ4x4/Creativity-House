<?php

namespace App\Jobs;

use App\Services\MetaCapiService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

/**
 * Async Meta CAPI dispatch so form / webhook responses stay fast.
 */
class SendMetaCapiEvent implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /**
     * @param  array<string, mixed>  $userData
     * @param  array<string, mixed>  $customData
     */
    public function __construct(
        public string $eventName,
        public string $eventId,
        public array $userData = [],
        public array $customData = [],
        public ?string $eventSourceUrl = null,
    ) {}

    public function handle(MetaCapiService $meta): void
    {
        try {
            $meta->sendEvent(
                $this->eventName,
                $this->eventId,
                $this->userData,
                $this->customData,
                $this->eventSourceUrl,
            );
        } catch (Throwable) {
            // MetaCapiService already swallows errors; belt-and-suspenders.
        }
    }
}
