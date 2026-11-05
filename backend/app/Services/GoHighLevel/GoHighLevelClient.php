<?php

namespace App\Services\GoHighLevel;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Thin HTTP client for GoHighLevel LeadConnector API v2 (Private Integration).
 * Never logs the token or full PII.
 */
class GoHighLevelClient
{
    /** @var array<int, string> Website-folder custom fields */
    public const CUSTOM_FIELD_KEYS = [
        'website_user_id',
        'last_course',
        'last_course_mode',
        'last_order_amount',
        'last_order_currency',
        'enrolled_courses',
        'last_enrolled_at',
        'course_url',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'google_click_id',
        'fbclid',
        'preferred_language',
    ];

    /** Contact Us workflow fields (exist in GHL outside the Website folder). */
    public const WORKFLOW_CUSTOM_FIELD_KEYS = [
        'target_course',
        'contact_message',
    ];

    private bool $disabledLogged = false;

    private bool $pipelineWarned = false;

    /** @var array<string, bool> */
    private array $missingFieldWarned = [];

    public function isEnabled(): bool
    {
        $enabled = (bool) config('services.gohighlevel.enabled');
        $token = (string) config('services.gohighlevel.private_token');
        $location = (string) config('services.gohighlevel.location_id');

        if ($enabled && $token !== '' && $location !== '') {
            return true;
        }

        if (! $this->disabledLogged) {
            $this->disabledLogged = true;
            Log::debug('GoHighLevel sync skipped (disabled or missing token/location).');
        }

        return false;
    }

    public function canSyncOpportunities(): bool
    {
        if (! $this->isEnabled()) {
            return false;
        }

        $pipeline = (string) config('services.gohighlevel.pipeline_id');
        if ($pipeline === '') {
            if (! $this->pipelineWarned) {
                $this->pipelineWarned = true;
                Log::warning('GoHighLevel opportunity sync skipped (GHL_PIPELINE_ID empty).');
            }

            return false;
        }

        return true;
    }

    public function stageId(string $key): ?string
    {
        $id = (string) (config("services.gohighlevel.stages.{$key}") ?? '');

        return $id !== '' ? $id : null;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{ok: bool, id: ?string, http_status: ?int, error: ?string}
     */
    public function upsertContactResult(array $data): array
    {
        if (! $this->isEnabled()) {
            return ['ok' => false, 'id' => null, 'http_status' => null, 'error' => 'ghl_disabled'];
        }

        $payload = $this->withoutBlanks([
            'locationId' => (string) config('services.gohighlevel.location_id'),
            ...$data,
        ]);

        $response = $this->request('POST', '/contacts/upsert', $payload);
        if ($response === null) {
            return ['ok' => false, 'id' => null, 'http_status' => null, 'error' => 'No response from POST /contacts/upsert'];
        }

        if (! $response->successful()) {
            return [
                'ok' => false,
                'id' => null,
                'http_status' => $response->status(),
                'error' => $this->responseSnippet($response),
            ];
        }

        $id = $response->json('contact.id')
            ?? $response->json('id')
            ?? $response->json('contactId');

        if (! is_string($id) || $id === '') {
            return [
                'ok' => false,
                'id' => null,
                'http_status' => $response->status(),
                'error' => 'Upsert succeeded but contact id missing: '.$this->responseSnippet($response),
            ];
        }

        return ['ok' => true, 'id' => $id, 'http_status' => $response->status(), 'error' => null];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function upsertContact(array $data): ?string
    {
        $result = $this->upsertContactResult($data);

        return $result['ok'] ? $result['id'] : null;
    }

    /**
     * @param  list<string>  $tags
     * @return array{ok: bool, http_status: ?int, error: ?string}
     */
    public function addTagsResult(string $contactId, array $tags): array
    {
        if (! $this->isEnabled() || $contactId === '' || $tags === []) {
            return ['ok' => false, 'http_status' => null, 'error' => 'add_tags_skipped'];
        }

        $response = $this->request('POST', "/contacts/{$contactId}/tags", [
            'tags' => array_values(array_unique(array_filter($tags))),
        ]);

        if ($response === null) {
            return ['ok' => false, 'http_status' => null, 'error' => 'No response from POST /contacts/{id}/tags'];
        }

        if (! $response->successful()) {
            return [
                'ok' => false,
                'http_status' => $response->status(),
                'error' => $this->responseSnippet($response),
            ];
        }

        return ['ok' => true, 'http_status' => $response->status(), 'error' => null];
    }

    /**
     * @param  list<string>  $tags
     */
    public function addTags(string $contactId, array $tags): bool
    {
        return $this->addTagsResult($contactId, $tags)['ok'];
    }

    /**
     * @param  list<string>  $tags
     * @return array{ok: bool, http_status: ?int, error: ?string}
     */
    public function removeTagsResult(string $contactId, array $tags): array
    {
        if (! $this->isEnabled() || $contactId === '' || $tags === []) {
            return ['ok' => false, 'http_status' => null, 'error' => 'remove_tags_skipped'];
        }

        $response = $this->request('DELETE', "/contacts/{$contactId}/tags", [
            'tags' => array_values(array_unique(array_filter($tags))),
        ]);

        if ($response === null) {
            return ['ok' => false, 'http_status' => null, 'error' => 'No response from DELETE /contacts/{id}/tags'];
        }

        // Tag already absent is fine — workflow re-trigger still proceeds to add.
        if ($response->successful() || $response->status() === 404) {
            return ['ok' => true, 'http_status' => $response->status(), 'error' => null];
        }

        return [
            'ok' => false,
            'http_status' => $response->status(),
            'error' => $this->responseSnippet($response),
        ];
    }

    /**
     * @param  list<string>  $tags
     */
    public function removeTags(string $contactId, array $tags): bool
    {
        return $this->removeTagsResult($contactId, $tags)['ok'];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function upsertOpportunity(array $data): ?string
    {
        if (! $this->canSyncOpportunities()) {
            return null;
        }

        $stageId = (string) ($data['pipelineStageId'] ?? '');
        if ($stageId === '') {
            if (! $this->pipelineWarned) {
                $this->pipelineWarned = true;
                Log::warning('GoHighLevel opportunity sync skipped (stage id empty).');
            }

            return null;
        }

        $payload = $this->withoutBlanks([
            'locationId' => (string) config('services.gohighlevel.location_id'),
            'pipelineId' => (string) config('services.gohighlevel.pipeline_id'),
            ...$data,
        ]);

        $response = $this->request('POST', '/opportunities/upsert', $payload);
        if ($response !== null && $response->successful()) {
            $id = $response->json('opportunity.id')
                ?? $response->json('id')
                ?? $response->json('opportunityId');

            return is_string($id) && $id !== '' ? $id : null;
        }

        return $this->upsertOpportunityFallback($payload);
    }

    public function customFieldsCacheKey(?string $locationId = null): string
    {
        $locationId ??= (string) config('services.gohighlevel.location_id');

        return 'ghl.custom_fields.'.$locationId;
    }

    public function clearCustomFieldsCache(?string $locationId = null): void
    {
        Cache::forget($this->customFieldsCacheKey($locationId));
    }

    /**
     * @return array<string, string> map of our short key => GHL field id
     */
    public function getCustomFieldIds(): array
    {
        if (! $this->isEnabled()) {
            return [];
        }

        $locationId = (string) config('services.gohighlevel.location_id');

        /** @var array<string, string> $map */
        $map = Cache::remember($this->customFieldsCacheKey($locationId), now()->addHour(), function () use ($locationId): array {
            return $this->resolveCustomFieldIds($locationId);
        });

        return $map;
    }

    /**
     * Fetch raw custom fields from both GHL endpoints (for diagnose --list-fields).
     *
     * @return list<array{name: string, fieldKey: string, id: string, endpoint: string}>
     */
    public function listCustomFields(): array
    {
        if (! $this->isEnabled()) {
            return [];
        }

        $locationId = (string) config('services.gohighlevel.location_id');
        $listed = [];

        foreach ($this->fetchCustomFieldsFromEndpoints($locationId) as $row) {
            $listed[] = [
                'name' => (string) ($row['field']['name'] ?? $row['field']['fieldName'] ?? ''),
                'fieldKey' => (string) ($row['field']['fieldKey']
                    ?? $row['field']['key']
                    ?? $row['field']['placeholder']
                    ?? ''),
                'id' => (string) ($row['field']['id'] ?? ''),
                'endpoint' => $row['endpoint'],
            ];
        }

        return $listed;
    }

    /**
     * @param  array<string, string|null>  $values  our keys => string values
     * @return list<array{id: string, field_value: string}>
     */
    public function buildCustomFieldsPayload(array $values): array
    {
        $ids = $this->getCustomFieldIds();
        $out = [];

        foreach ($values as $key => $value) {
            // null = omit; empty string is sent (e.g. target_course when none selected).
            if ($value === null) {
                continue;
            }
            $normalized = $this->normalizeFieldKey((string) $key);
            $fieldId = $ids[$normalized] ?? $ids[$key] ?? null;
            if ($fieldId === null) {
                if (! ($this->missingFieldWarned[$key] ?? false)) {
                    $this->missingFieldWarned[$key] = true;
                    Log::warning('GoHighLevel custom field missing; skipping.', ['key' => $key]);
                }

                continue;
            }
            $out[] = [
                'id' => $fieldId,
                'field_value' => (string) $value,
            ];
        }

        return $out;
    }

    /**
     * Normalize GHL / our field keys for matching.
     * "{{ contact.website_user_id }}" / "contact.website_user_id" → "website_user_id"
     */
    public function normalizeFieldKey(string $key): string
    {
        $key = strtolower(trim($key));
        $key = str_replace(['{', '}'], '', $key);
        $key = preg_replace('/\s+/', '', $key) ?? $key;
        if (str_starts_with($key, 'contact.')) {
            $key = substr($key, strlen('contact.'));
        }

        return $key;
    }

    /**
     * @return array<string, string>
     */
    private function resolveCustomFieldIds(string $locationId): array
    {
        $byNormalized = [];

        foreach ($this->fetchCustomFieldsFromEndpoints($locationId) as $row) {
            $field = $row['field'];
            $id = (string) ($field['id'] ?? '');
            if ($id === '') {
                continue;
            }

            $candidates = [
                $field['fieldKey'] ?? null,
                $field['key'] ?? null,
                $field['placeholder'] ?? null,
                $field['name'] ?? null,
                $field['fieldName'] ?? null,
            ];

            foreach ($candidates as $candidate) {
                if (! is_string($candidate) || trim($candidate) === '') {
                    continue;
                }
                $normalized = $this->normalizeFieldKey($candidate);
                if ($normalized === '') {
                    continue;
                }
                $byNormalized[$normalized] ??= $id;
            }
        }

        $resolved = [];
        foreach ([...self::CUSTOM_FIELD_KEYS, ...self::WORKFLOW_CUSTOM_FIELD_KEYS] as $ourKey) {
            $normalized = $this->normalizeFieldKey($ourKey);
            if (isset($byNormalized[$normalized])) {
                $resolved[$ourKey] = $byNormalized[$normalized];
            }
        }

        // Also keep any normalized extras so lookups by normalized key still work.
        foreach ($byNormalized as $normalized => $id) {
            $resolved[$normalized] ??= $id;
        }

        return $resolved;
    }

    /**
     * @return list<array{field: array<string, mixed>, endpoint: string}>
     */
    private function fetchCustomFieldsFromEndpoints(string $locationId): array
    {
        $rows = [];

        $legacyEndpoint = "/locations/{$locationId}/customFields";
        foreach ($this->paginateCustomFields($legacyEndpoint, ['model' => 'contact']) as $field) {
            $rows[] = ['field' => $field, 'endpoint' => $legacyEndpoint];
        }

        // Merge the object-key endpoint (newer GHL shape) so {{contact.*}} keys resolve.
        $objectEndpoint = '/custom-fields/object-key/contact';
        foreach ($this->paginateCustomFields($objectEndpoint, ['locationId' => $locationId]) as $field) {
            $rows[] = ['field' => $field, 'endpoint' => $objectEndpoint];
        }

        return $rows;
    }

    /**
     * @param  array<string, mixed>  $query
     * @return list<array<string, mixed>>
     */
    private function paginateCustomFields(string $path, array $query): array
    {
        $fields = [];
        $page = 1;
        $maxPages = 20;
        $cursor = null;

        while ($page <= $maxPages) {
            $params = $query;
            if ($cursor !== null) {
                $params['startAfterId'] = $cursor;
            } elseif ($page > 1) {
                $params['page'] = $page;
            }

            $response = $this->request('GET', $path, $params);
            if ($response === null || ! $response->successful()) {
                break;
            }

            $batch = $this->extractCustomFieldList($response->json() ?? []);
            if ($batch === []) {
                break;
            }

            foreach ($batch as $field) {
                if (is_array($field)) {
                    $fields[] = $field;
                }
            }

            $meta = $response->json('meta') ?? [];
            $nextCursor = is_array($meta)
                ? ($meta['startAfterId'] ?? $meta['nextCursor'] ?? $meta['nextPage'] ?? null)
                : null;
            $hasMore = is_array($meta)
                ? (bool) ($meta['nextPage'] ?? $meta['hasMore'] ?? false)
                : false;

            if (is_string($nextCursor) && $nextCursor !== '') {
                $cursor = $nextCursor;
                $page++;

                continue;
            }

            if ($hasMore || (is_int($nextCursor) && $nextCursor > $page)) {
                $page = is_int($nextCursor) ? $nextCursor : $page + 1;
                $cursor = null;

                continue;
            }

            // Heuristic: if we got a full page of 100, try one more page.
            if (count($batch) >= 100) {
                $page++;
                $cursor = null;

                continue;
            }

            break;
        }

        return $fields;
    }

    /**
     * @param  array<string, mixed>|list<mixed>  $json
     * @return list<mixed>
     */
    private function extractCustomFieldList(array $json): array
    {
        foreach (['customFields', 'fields', 'data', 'customField'] as $key) {
            if (isset($json[$key]) && is_array($json[$key])) {
                // Nested { data: { customFields: [...] } }
                if (array_is_list($json[$key])) {
                    return $json[$key];
                }
                foreach (['customFields', 'fields'] as $nested) {
                    if (isset($json[$key][$nested]) && is_array($json[$key][$nested]) && array_is_list($json[$key][$nested])) {
                        return $json[$key][$nested];
                    }
                }
            }
        }

        if (array_is_list($json)) {
            return $json;
        }

        return [];
    }

    public function getLocation(): ?Response
    {
        if (! $this->isEnabled()) {
            return null;
        }

        $locationId = (string) config('services.gohighlevel.location_id');

        return $this->request('GET', "/locations/{$locationId}");
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function getPipelines(): array
    {
        if (! $this->isEnabled()) {
            return [];
        }

        $locationId = (string) config('services.gohighlevel.location_id');
        $response = $this->request('GET', '/opportunities/pipelines', [
            'locationId' => $locationId,
        ]);

        if ($response === null || ! $response->successful()) {
            return [];
        }

        $pipelines = $response->json('pipelines') ?? $response->json('data') ?? [];

        return is_array($pipelines) ? $pipelines : [];
    }

    /**
     * @param  array<string, mixed>|null  $queryOrBody
     */
    public function request(string $method, string $path, ?array $queryOrBody = null): ?Response
    {
        if (! $this->isEnabled()) {
            return null;
        }

        $method = strtoupper($method);
        $url = rtrim((string) config('services.gohighlevel.api_base'), '/').$path;
        $attempts = 0;
        $maxAttempts = 3;
        $response = null;

        while ($attempts < $maxAttempts) {
            $attempts++;

            try {
                $pending = $this->http();
                $response = match ($method) {
                    'GET' => $pending->get($url, $queryOrBody ?? []),
                    'DELETE' => $pending
                        ->withBody(json_encode($queryOrBody ?? []), 'application/json')
                        ->delete($url),
                    default => $pending->send($method, $url, [
                        'json' => $queryOrBody ?? [],
                    ]),
                };
            } catch (Throwable $e) {
                Log::error('GoHighLevel request failed.', [
                    'method' => $method,
                    'path' => $path,
                    'attempt' => $attempts,
                    'message' => $e->getMessage(),
                ]);

                if ($attempts >= $maxAttempts) {
                    return null;
                }

                usleep($this->backoffMicros($attempts, null));

                continue;
            }

            $status = $response->status();
            $shouldRetry = $status === 429 || $status >= 500;

            if (! $shouldRetry || $attempts >= $maxAttempts) {
                $this->logCall($method, $path, $response, $queryOrBody);

                return $response;
            }

            usleep($this->backoffMicros($attempts, $response));
        }

        return $response;
    }

    private function http(?string $version = null): PendingRequest
    {
        $token = (string) config('services.gohighlevel.private_token');
        $version ??= (string) config('services.gohighlevel.api_version', '2021-07-28');

        return Http::withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Version' => $version,
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ])->timeout(10);
    }

    private function responseSnippet(?Response $response): string
    {
        if ($response === null) {
            return 'No response from GHL';
        }

        $body = trim((string) $response->body());
        if ($body === '') {
            return 'Empty response body (HTTP '.$response->status().')';
        }

        return mb_substr($body, 0, 300);
    }

    private function backoffMicros(int $attempt, ?Response $response): int
    {
        if ($response !== null) {
            $retryAfter = (int) $response->header('Retry-After');
            if ($retryAfter > 0) {
                return min($retryAfter, 30) * 1_000_000;
            }
        }

        return (int) (250_000 * (2 ** max(0, $attempt - 1)));
    }

    /**
     * @param  array<string, mixed>|null  $payload
     */
    private function logCall(string $method, string $path, Response $response, ?array $payload): void
    {
        $contactId = null;
        if (is_array($payload)) {
            $contactId = $payload['contactId'] ?? null;
        }
        $contactId = $contactId
            ?? $response->json('contact.id')
            ?? $response->json('contactId');

        Log::info('GoHighLevel API call.', [
            'method' => $method,
            'path' => $path,
            'status' => $response->status(),
            'trace_id' => $response->header('x-trace-id')
                ?: $response->header('X-Trace-Id')
                ?: $response->header('x-request-id')
                ?: null,
            'contact_id' => is_string($contactId) ? $contactId : null,
            'email_masked' => $this->maskEmail(is_array($payload) ? ($payload['email'] ?? null) : null),
            'phone_masked' => $this->maskPhone(is_array($payload) ? ($payload['phone'] ?? null) : null),
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function upsertOpportunityFallback(array $payload): ?string
    {
        $contactId = (string) ($payload['contactId'] ?? '');
        $pipelineId = (string) ($payload['pipelineId'] ?? '');
        $locationId = (string) ($payload['locationId'] ?? '');

        if ($contactId === '' || $pipelineId === '') {
            return null;
        }

        $search = $this->request('GET', '/opportunities/search', [
            'location_id' => $locationId,
            'contact_id' => $contactId,
            'pipeline_id' => $pipelineId,
            'status' => 'open',
        ]);

        $existingId = null;
        if ($search !== null && $search->successful()) {
            $opps = $search->json('opportunities') ?? $search->json('data') ?? [];
            if (is_array($opps) && isset($opps[0]) && is_array($opps[0])) {
                $existingId = (string) ($opps[0]['id'] ?? '');
            }
        }

        if ($existingId !== '') {
            $response = $this->request('PUT', "/opportunities/{$existingId}", $payload);
            if ($response !== null && $response->successful()) {
                return $existingId;
            }

            return null;
        }

        $response = $this->request('POST', '/opportunities/', $payload);
        if ($response === null || ! $response->successful()) {
            return null;
        }

        $id = $response->json('opportunity.id') ?? $response->json('id');

        return is_string($id) && $id !== '' ? $id : null;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function withoutBlanks(array $data): array
    {
        return array_filter(
            $data,
            static fn ($v) => $v !== null && $v !== '' && $v !== []
        );
    }

    private function maskEmail(mixed $email): ?string
    {
        if (! is_string($email) || $email === '' || ! str_contains($email, '@')) {
            return null;
        }
        [$local, $domain] = explode('@', $email, 2);

        return substr($local, 0, 1).'***@'.$domain;
    }

    private function maskPhone(mixed $phone): ?string
    {
        if (! is_string($phone) || $phone === '') {
            return null;
        }
        $digits = preg_replace('/\D+/', '', $phone) ?? '';
        if (strlen($digits) < 4) {
            return '***';
        }

        return '***'.substr($digits, -4);
    }
}
