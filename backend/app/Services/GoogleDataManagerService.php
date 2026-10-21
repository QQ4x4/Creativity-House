<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Google Ads conversions via the Data Manager API (events:ingest).
 *
 * @see https://developers.google.com/data-manager/api/reference/rest/v1/events/ingest
 */
class GoogleDataManagerService
{
    private const TOKEN_CACHE_KEY = 'google_ads_datamanager_access_token';

    private const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';

    private const INGEST_URL = 'https://datamanager.googleapis.com/v1/events:ingest';

    private const SCOPE = 'https://www.googleapis.com/auth/datamanager';

    /**
     * @param  array{email?: string|null, phone?: string|null}  $userData
     * @param  array{gclid?: string|null, gbraid?: string|null, wbraid?: string|null}  $adIdentifiers
     */
    public function sendConversion(
        string $transactionId,
        array $userData = [],
        array $adIdentifiers = [],
        ?string $conversionActionId = null,
        ?float $conversionValue = null,
        string $currency = 'USD',
    ): bool {
        $customerId = $this->normalizeCustomerId(
            (string) config('services.google_ads.customer_id', '')
        );
        $actionId = preg_replace(
            '/\D+/',
            '',
            (string) ($conversionActionId ?: config('services.google_ads.lead_action_id', ''))
        ) ?? '';

        if ($customerId === '' || $actionId === '') {
            if (config('app.debug')) {
                Log::debug('Google Ads Data Manager skipped — customer_id or lead_action_id missing.', [
                    'transaction_id' => $transactionId,
                ]);
            }

            return false;
        }

        $transactionId = trim($transactionId);
        if ($transactionId === '') {
            Log::warning('Google Ads Data Manager skipped — empty transactionId.');

            return false;
        }

        $gclid = trim((string) ($adIdentifiers['gclid'] ?? ''));
        $gbraid = trim((string) ($adIdentifiers['gbraid'] ?? ''));
        $wbraid = trim((string) ($adIdentifiers['wbraid'] ?? ''));

        if ($gclid === '' && $gbraid === '' && $wbraid === '') {
            Log::info('Google Ads Data Manager skipped — no gclid/gbraid/wbraid.', [
                'transaction_id' => $transactionId,
            ]);

            return false;
        }

        try {
            $accessToken = $this->getAccessToken();
            if ($accessToken === null || $accessToken === '') {
                return false;
            }

            $identifiers = [];
            $emailHash = $this->hashEmail($userData['email'] ?? null);
            if ($emailHash !== null) {
                $identifiers[] = ['emailAddress' => $emailHash];
            }
            $phoneHash = $this->hashPhone($userData['phone'] ?? null);
            if ($phoneHash !== null) {
                $identifiers[] = ['phoneNumber' => $phoneHash];
            }

            $adIds = array_filter([
                'gclid' => $gclid !== '' ? $gclid : null,
                'gbraid' => $gbraid !== '' ? $gbraid : null,
                'wbraid' => $wbraid !== '' ? $wbraid : null,
            ], static fn ($v) => $v !== null && $v !== '');

            $event = [
                'transactionId' => $transactionId,
                'eventTimestamp' => now()->utc()->format('Y-m-d\TH:i:s\Z'),
                'eventSource' => 'WEB',
                'adIdentifiers' => $adIds,
                'currency' => strtoupper($currency ?: 'USD'),
            ];

            if ($conversionValue !== null) {
                $event['conversionValue'] = $conversionValue;
            }

            if ($identifiers !== []) {
                $event['userData'] = [
                    'userIdentifiers' => $identifiers,
                ];
            }

            $payload = [
                'destinations' => [
                    [
                        'operatingAccount' => [
                            'accountType' => 'GOOGLE_ADS',
                            'accountId' => $customerId,
                        ],
                        'productDestinationId' => $actionId,
                    ],
                ],
                'encoding' => 'HEX',
                'consent' => [
                    'adUserData' => 'CONSENT_GRANTED',
                    'adPersonalization' => 'CONSENT_GRANTED',
                ],
                'events' => [$event],
                'validateOnly' => (bool) config('services.google_ads.validate_only', false),
            ];

            if (config('app.debug')) {
                Log::debug('Google Ads Data Manager request.', [
                    'transaction_id' => $transactionId,
                    'customer_id' => $customerId,
                    'action_id' => $actionId,
                    'validate_only' => $payload['validateOnly'],
                    'has_gclid' => $gclid !== '',
                ]);
            }

            $pending = Http::timeout(8)
                ->acceptJson()
                ->asJson()
                ->withToken($accessToken);

            if (app()->isLocal() || config('app.env') === 'local') {
                $pending = $pending->withoutVerifying();
            }

            /** @var Response $response */
            $response = $pending->post(self::INGEST_URL, $payload);

            if ($response->successful()) {
                Log::info('Google Ads Data Manager response.', [
                    'transaction_id' => $transactionId,
                    'status' => $response->status(),
                    'validate_only' => $payload['validateOnly'],
                    'request_id' => $response->json('requestId'),
                    'field_warnings' => $response->json('fieldWarnings'),
                ]);
            } else {
                Log::warning('Google Ads Data Manager response.', [
                    'transaction_id' => $transactionId,
                    'status' => $response->status(),
                    'validate_only' => $payload['validateOnly'],
                    'body' => $response->json() ?? $response->body(),
                ]);
            }

            return $response->successful();
        } catch (Throwable $e) {
            Log::error('Google Ads Data Manager request failed.', [
                'transaction_id' => $transactionId,
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }

    public function getAccessToken(): ?string
    {
        try {
            $cached = Cache::get(self::TOKEN_CACHE_KEY);
            if (is_string($cached) && $cached !== '') {
                return $cached;
            }

            $credentials = $this->parseServiceAccountJson();
            if ($credentials === null) {
                return null;
            }

            $jwt = $this->buildServiceAccountJwt($credentials);
            if ($jwt === null) {
                return null;
            }

            $pending = Http::timeout(8)->asForm();
            if (app()->isLocal() || config('app.env') === 'local') {
                $pending = $pending->withoutVerifying();
            }

            $response = $pending->post(self::OAUTH_TOKEN_URL, [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]);

            if (! $response->successful()) {
                Log::error('Google Ads OAuth token exchange failed.', [
                    'status' => $response->status(),
                    'body' => $response->json() ?? $response->body(),
                ]);

                return null;
            }

            $token = (string) ($response->json('access_token') ?? '');
            if ($token === '') {
                Log::error('Google Ads OAuth response missing access_token.');

                return null;
            }

            // Cache for 50 minutes (tokens are typically valid for 60).
            Cache::put(self::TOKEN_CACHE_KEY, $token, now()->addMinutes(50));

            return $token;
        } catch (Throwable $e) {
            Log::error('Google Ads OAuth token generation failed.', [
                'message' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * @return array{client_email?: string, private_key?: string}|null
     */
    private function parseServiceAccountJson(): ?array
    {
        $raw = (string) config('services.google_ads.service_account_json', '');
        if (trim($raw) === '') {
            if (config('app.debug')) {
                Log::debug('Google Ads service_account_json is empty.');
            }

            return null;
        }

        // Allow a filesystem path to a JSON key file.
        if (is_file($raw)) {
            $raw = (string) file_get_contents($raw);
        }

        $decoded = json_decode($raw, true);
        if (! is_array($decoded)) {
            // Env values sometimes double-escape newlines; try unescaping.
            $decoded = json_decode(stripslashes($raw), true);
        }

        if (! is_array($decoded) || blank($decoded['client_email'] ?? null) || blank($decoded['private_key'] ?? null)) {
            Log::error('Google Ads service_account_json is invalid or missing client_email/private_key.');

            return null;
        }

        return $decoded;
    }

    /**
     * @param  array{client_email: string, private_key: string}  $credentials
     */
    private function buildServiceAccountJwt(array $credentials): ?string
    {
        $now = time();
        $header = ['alg' => 'RS256', 'typ' => 'JWT'];
        $claims = [
            'iss' => $credentials['client_email'],
            'scope' => self::SCOPE,
            'aud' => self::OAUTH_TOKEN_URL,
            'iat' => $now,
            'exp' => $now + 3600,
        ];

        $segments = [
            $this->base64UrlEncode((string) json_encode($header)),
            $this->base64UrlEncode((string) json_encode($claims)),
        ];
        $signingInput = implode('.', $segments);

        $privateKey = openssl_pkey_get_private((string) $credentials['private_key']);
        if ($privateKey === false) {
            Log::error('Google Ads service account private_key could not be parsed by OpenSSL.');

            return null;
        }

        $signature = '';
        $ok = openssl_sign($signingInput, $signature, $privateKey, OPENSSL_ALGO_SHA256);
        if (! $ok) {
            Log::error('Google Ads JWT openssl_sign failed.');

            return null;
        }

        return $signingInput.'.'.$this->base64UrlEncode($signature);
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function normalizeCustomerId(string $customerId): string
    {
        return preg_replace('/\D+/', '', $customerId) ?? '';
    }

    public function hashEmail(?string $email): ?string
    {
        if (! is_string($email)) {
            return null;
        }
        $normalized = mb_strtolower(trim($email));
        if ($normalized === '' || ! filter_var($normalized, FILTER_VALIDATE_EMAIL)) {
            return null;
        }

        return strtoupper(hash('sha256', $normalized));
    }

    /**
     * Normalize to E.164 (+digits), then SHA-256 hex (uppercase) for Data Manager.
     */
    public function hashPhone(?string $phone): ?string
    {
        if (! is_string($phone)) {
            return null;
        }

        $raw = trim($phone);
        if ($raw === '') {
            return null;
        }

        if (str_starts_with($raw, '00')) {
            $raw = '+'.substr($raw, 2);
        }

        $digits = preg_replace('/\D+/', '', $raw) ?? '';
        if ($digits === '') {
            return null;
        }

        $e164 = '+'.$digits;

        return strtoupper(hash('sha256', $e164));
    }
}
