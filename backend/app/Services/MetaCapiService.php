<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Meta Conversions API (CAPI) client.
 *
 * Events share event_id with the browser Pixel / GTM dataLayer for deduplication.
 *
 * @see https://developers.facebook.com/docs/marketing-api/conversions-api
 */
class MetaCapiService
{
    /**
     * Send a single conversion event. Never throws — callers must stay resilient.
     *
     * @param  array{
     *     email?: string|null,
     *     phone?: string|null,
     *     first_name?: string|null,
     *     last_name?: string|null,
     *     name?: string|null,
     *     country?: string|null,
     *     anonymous_id?: string|null,
     *     client_ip_address?: string|null,
     *     client_user_agent?: string|null,
     *     fbp?: string|null,
     *     fbc?: string|null,
     * }  $userData
     * @param  array<string, mixed>  $customData
     */
    public function sendEvent(
        string $eventName,
        string $eventId,
        array $userData = [],
        array $customData = [],
        ?string $eventSourceUrl = null,
    ): bool {
        $pixelId = (string) (config('services.meta.pixel_id') ?: '');
        $token = (string) (
            config('services.meta.access_token')
            ?: config('services.meta.capi_access_token')
            ?: ''
        );

        if ($pixelId === '' || $token === '') {
            if (config('app.debug')) {
                Log::debug('Meta CAPI skipped — pixel id or access token not configured.', [
                    'event_name' => $eventName,
                    'event_id' => $eventId,
                ]);
            }

            return false;
        }

        $eventId = trim($eventId);
        if ($eventId === '') {
            Log::warning('Meta CAPI skipped — empty event_id.', [
                'event_name' => $eventName,
            ]);

            return false;
        }

        $userData = $this->mergeRequestContext($userData);
        $sourceUrl = $eventSourceUrl
            ?: (request()?->headers->get('Referer'))
            ?: (string) (request()?->fullUrl() ?: url()->current());

        $payload = [
            'data' => [
                [
                    'event_name' => $eventName,
                    'event_time' => now()->timestamp,
                    'event_id' => $eventId,
                    'event_source_url' => $sourceUrl,
                    'action_source' => 'website',
                    'user_data' => $this->buildUserData($userData),
                    'custom_data' => $customData === [] ? (object) [] : $customData,
                ],
            ],
        ];

        $testCode = (string) (
            config('services.meta.test_code')
            ?: config('services.meta.test_event_code')
            ?: ''
        );
        if ($testCode !== '') {
            $payload['test_event_code'] = $testCode;
        }

        $url = sprintf(
            'https://graph.facebook.com/%s/%s/events',
            config('services.meta.graph_version', 'v19.0'),
            $pixelId
        );

        try {
            if (config('app.debug')) {
                Log::debug('Meta CAPI request.', [
                    'event_name' => $eventName,
                    'event_id' => $eventId,
                    'url' => $url,
                    'payload' => $payload,
                ]);
            }

            // Local WAMP/Windows often lacks a CA bundle → cURL error 60.
            $pending = Http::timeout(5)
                ->acceptJson()
                ->asJson()
                ->withQueryParameters(['access_token' => $token]);

            if (app()->isLocal() || config('app.env') === 'local') {
                $pending = $pending->withoutVerifying();
            }

            /** @var Response $response */
            $response = $pending->post($url, $payload);

            if (config('app.debug') || ! $response->successful()) {
                Log::log($response->successful() ? 'debug' : 'warning', 'Meta CAPI response.', [
                    'event_name' => $eventName,
                    'event_id' => $eventId,
                    'status' => $response->status(),
                    'body' => $response->json() ?? $response->body(),
                ]);
            }

            return $response->successful();
        } catch (Throwable $e) {
            Log::error('Meta CAPI request failed.', [
                'event_name' => $eventName,
                'event_id' => $eventId,
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Fill IP / UA / fbp / fbc from the current HTTP request when omitted.
     *
     * @param  array<string, mixed>  $userData
     * @return array<string, mixed>
     */
    public function mergeRequestContext(array $userData): array
    {
        $req = request();
        if (! $req) {
            return $userData;
        }

        if (blank($userData['client_ip_address'] ?? null)) {
            $userData['client_ip_address'] = $req->ip();
        }

        if (blank($userData['client_user_agent'] ?? null)) {
            $userData['client_user_agent'] = (string) $req->userAgent();
        }

        if (blank($userData['fbp'] ?? null)) {
            $userData['fbp'] = $req->cookie('_fbp');
        }

        if (blank($userData['fbc'] ?? null)) {
            $userData['fbc'] = $req->cookie('_fbc');
        }

        return $userData;
    }

    /**
     * @param  array<string, mixed>  $userData
     * @return array<string, mixed>
     */
    public function buildUserData(array $userData): array
    {
        $out = [];

        $email = $userData['email'] ?? null;
        if (is_string($email) && trim($email) !== '') {
            $out['em'] = [$this->hashEmail($email)];
        }

        $phone = $userData['phone'] ?? null;
        if (is_string($phone) && trim($phone) !== '') {
            $hashedPhone = $this->hashPhone($phone);
            if ($hashedPhone !== null) {
                $out['ph'] = [$hashedPhone];
            }
        }

        $first = $userData['first_name'] ?? null;
        $last = $userData['last_name'] ?? null;
        $fullName = $userData['name'] ?? null;

        if ((! is_string($first) || trim($first) === '') && is_string($fullName) && trim($fullName) !== '') {
            $parts = preg_split('/\s+/', trim($fullName), 2) ?: [];
            $first = $parts[0] ?? null;
            $last = $last ?: ($parts[1] ?? null);
        }

        if (is_string($first) && trim($first) !== '') {
            $out['fn'] = [$this->hashSha256(mb_strtolower(trim($first)))];
        }

        if (is_string($last) && trim($last) !== '') {
            $out['ln'] = [$this->hashSha256(mb_strtolower(trim($last)))];
        }

        $country = $userData['country'] ?? null;
        if (is_string($country) && trim($country) !== '') {
            $normalized = mb_strtolower(trim($country));
            if (preg_match('/^[a-z]{2}$/', $normalized) === 1) {
                $out['country'] = [$this->hashSha256($normalized)];
            }
        }

        $anonymousId = $userData['anonymous_id'] ?? null;
        if (is_string($anonymousId) && trim($anonymousId) !== '') {
            $out['external_id'] = [$this->hashSha256(trim($anonymousId))];
        }

        $ip = $userData['client_ip_address'] ?? null;
        if (is_string($ip) && filter_var($ip, FILTER_VALIDATE_IP)) {
            $out['client_ip_address'] = $ip;
        }

        $ua = $userData['client_user_agent'] ?? null;
        if (is_string($ua) && trim($ua) !== '') {
            $out['client_user_agent'] = trim($ua);
        }

        foreach (['fbp', 'fbc'] as $cookieKey) {
            $value = $userData[$cookieKey] ?? null;
            if (is_string($value) && trim($value) !== '') {
                $out[$cookieKey] = trim($value);
            }
        }

        return $out;
    }

    public function hashEmail(string $email): string
    {
        return $this->hashSha256(mb_strtolower(trim($email)));
    }

    public function hashPhone(string $phone): ?string
    {
        $digits = preg_replace('/[^0-9]/', '', $phone) ?? '';
        if ($digits === '') {
            return null;
        }

        return $this->hashSha256($digits);
    }

    private function hashSha256(string $value): string
    {
        return hash('sha256', $value);
    }
}
