<?php

namespace App\Jobs;

use App\Services\GoHighLevel\GoHighLevelSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncGhlInquiry implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(public array $payload) {}

    public function handle(GoHighLevelSyncService $sync): void
    {
        try {
            $sync->syncInquiry($this->payload);
        } catch (Throwable $e) {
            Log::warning('GoHighLevel inquiry sync failed.', [
                'message' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
