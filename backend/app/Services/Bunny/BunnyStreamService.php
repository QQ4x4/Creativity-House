<?php

namespace App\Services\Bunny;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Thin read-only wrapper over the Bunny Stream collection API.
 *
 * Only the admin video picker consumes this. Responses are cached briefly so
 * typing in the search palette does not hammer Bunny's rate limit.
 */
class BunnyStreamService
{
    private const CACHE_TTL_SECONDS = 120;

    private const MAX_PER_PAGE = 100;

    public function libraryId(): string
    {
        return (string) config('services.bunny.library_id');
    }

    public function isConfigured(): bool
    {
        return filled(config('services.bunny.api_key')) && filled($this->libraryId());
    }

    /**
     * List videos in the configured library.
     *
     * @return array{videos: list<array<string, mixed>>, total: int, page: int, per_page: int}
     */
    public function videos(string $search = '', int $page = 1, int $perPage = 100): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException(
                'Bunny Stream is not configured. Set BUNNY_STREAM_API_KEY and BUNNY_STREAM_LIBRARY_ID.'
            );
        }

        $page = max(1, $page);
        $perPage = max(1, min($perPage, self::MAX_PER_PAGE));
        $search = trim($search);

        $cacheKey = sprintf('bunny:videos:%s:%s:%d:%d', $this->libraryId(), md5($search), $page, $perPage);

        return Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($search, $page, $perPage): array {
            // WAMP/Windows often lacks a CA bundle, so cURL error 60 blocks Bunny
            // locally. Skip verification only in `local` — production (Railway) keeps TLS.
            $request = Http::withHeaders([
                'AccessKey' => (string) config('services.bunny.api_key'),
                'accept' => 'application/json',
            ])
                ->timeout(15)
                ->retry(2, 200);

            if (app()->environment('local')) {
                $request = $request->withoutVerifying();
            }

            $response = $request->get($this->endpoint(), array_filter([
                'page' => $page,
                'itemsPerPage' => $perPage,
                'search' => $search !== '' ? $search : null,
                'orderBy' => 'date',
            ], static fn ($value) => $value !== null));

            if ($response->failed()) {
                throw new RuntimeException(
                    'Bunny Stream request failed with status '.$response->status().'.'
                );
            }

            $payload = $response->json();

            $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];

            return [
                'videos' => array_values(array_map($this->transformVideo(...), $items)),
                'total' => (int) ($payload['totalItems'] ?? count($items)),
                'page' => (int) ($payload['currentPage'] ?? $page),
                'per_page' => $perPage,
            ];
        });
    }

    private function endpoint(): string
    {
        return rtrim((string) config('services.bunny.base_url'), '/')
            .'/library/'.$this->libraryId().'/videos';
    }

    /**
     * Reduce Bunny's payload to what the picker renders, so the admin UI never
     * depends on the upstream shape.
     *
     * @param  array<string, mixed>  $video
     * @return array<string, mixed>
     */
    private function transformVideo(array $video): array
    {
        $guid = (string) ($video['guid'] ?? '');
        $thumbnail = (string) ($video['thumbnailFileName'] ?? '');
        $pullZone = $video['pullZoneId'] ?? null;

        return [
            'guid' => $guid,
            'title' => (string) ($video['title'] ?? 'Untitled video'),
            // Bunny reports whole seconds in `length`.
            'duration' => (int) ($video['length'] ?? 0),
            'status' => (int) ($video['status'] ?? 0),
            'is_ready' => (int) ($video['status'] ?? 0) === 4,
            'views' => (int) ($video['views'] ?? 0),
            'created_at' => $video['dateUploaded'] ?? null,
            'thumbnail_url' => $guid !== '' && $thumbnail !== '' && $pullZone
                ? sprintf('https://vz-%s.b-cdn.net/%s/%s', $pullZone, $guid, $thumbnail)
                : null,
        ];
    }
}
