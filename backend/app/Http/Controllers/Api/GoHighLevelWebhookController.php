<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessGhlWebhook;
use App\Models\GhlSyncLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class GoHighLevelWebhookController extends Controller
{
    /**
     * POST /api/webhooks/gohighlevel — GHL Workflow webhook (CSRF-exempt).
     */
    public function __invoke(Request $request): JsonResponse
    {
        $expected = (string) config('services.gohighlevel.webhook_secret');
        $provided = (string) $request->header('X-CH-Webhook-Secret', '');

        if ($expected === '' || ! hash_equals($expected, $provided)) {
            GhlSyncLog::query()->create([
                'entity_type' => 'webhook',
                'entity_id' => null,
                'action' => 'auth',
                'status' => 'failed',
                'http_status' => 401,
                'error' => 'Invalid or missing X-CH-Webhook-Secret',
                'attempts' => 1,
            ]);

            return response()->json(['ok' => false, 'message' => 'Unauthorized'], 401);
        }

        /** @var array<string, mixed> $payload */
        $payload = $request->all();
        $action = (string) ($payload['action'] ?? '');

        GhlSyncLog::query()->create([
            'entity_type' => 'webhook',
            'entity_id' => (string) ($payload['email'] ?? $payload['contactId'] ?? 'incoming'),
            'action' => $action !== '' ? $action : 'received',
            'status' => 'received',
            'http_status' => 200,
            'attempts' => 1,
        ]);

        if ($action === 'enroll' && ! config('services.gohighlevel.inbound_enroll_enabled')) {
            Log::warning('GoHighLevel inbound enroll rejected (GHL_INBOUND_ENROLL_ENABLED=false).');

            return response()->json(['ok' => false, 'message' => 'Inbound enroll disabled'], 403);
        }

        try {
            ProcessGhlWebhook::dispatch($payload)->afterResponse();
        } catch (Throwable $e) {
            Log::warning('Failed to dispatch GoHighLevel inbound webhook job.', [
                'message' => $e->getMessage(),
            ]);
        }

        return response()->json(['ok' => true]);
    }
}
