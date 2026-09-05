<?php

namespace App\Services\Bunny;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Thin read-only wrapper over the Bunny Stream API.
 *
 * Only the admin video picker consumes this. Responses are cached briefly so
 * opening the media library does not hammer Bunny's rate limit.
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
            $payload = $this->getJson($this->videosEndpoint(), array_filter([
                'page' => $page,
                'itemsPerPage' => $perPage,
                'search' => $search !== '' ? $search : null,
                'orderBy' => 'date',
            ], static fn ($value) => $value !== null));

            $items = $this->itemsFrom($payload);

            return [
                'videos' => array_values(array_map($this->transformVideo(...), $items)),
                'total' => (int) ($payload['totalItems'] ?? $payload['TotalItems'] ?? count($items)),
                'page' => (int) ($payload['currentPage'] ?? $payload['CurrentPage'] ?? $page),
                'per_page' => $perPage,
            ];
        });
    }

    /**
     * List collections in the configured library.
     *
     * @return list<array{guid: string, name: string, video_count: int}>
     */
    public function collections(int $page = 1, int $perPage = 100): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException(
                'Bunny Stream is not configured. Set BUNNY_STREAM_API_KEY and BUNNY_STREAM_LIBRARY_ID.'
            );
        }

        $page = max(1, $page);
        $perPage = max(1, min($perPage, self::MAX_PER_PAGE));

        $cacheKey = sprintf('bunny:collections:%s:%d:%d', $this->libraryId(), $page, $perPage);

        return Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($page, $perPage): array {
            $payload = $this->getJson($this->collectionsEndpoint(), [
                'page' => $page,
                'itemsPerPage' => $perPage,
                'orderBy' => 'name',
            ]);

            $items = $this->itemsFrom($payload);

            return array_values(array_map($this->transformCollection(...), $items));
        });
    }

    /**
     * One-shot payload for the media-library picker: collections + videos
     * (each video carries collection_id so the UI can group/filter).
     *
     * @return array{
     *   videos: list<array<string, mixed>>,
     *   collections: list<array{guid: string, name: string, video_count: int}>,
     *   total: int,
     *   page: int,
     *   per_page: int
     * }
     */
    public function library(string $search = '', int $page = 1, int $perPage = 100): array
    {
        $videos = $this->videos($search, $page, $perPage);
        $collections = $this->collections();

        return [
            'videos' => $videos['videos'],
            'collections' => $collections,
            'total' => $videos['total'],
            'page' => $videos['page'],
            'per_page' => $videos['per_page'],
        ];
    }

    private function client(): PendingRequest
    {
        // WAMP/Windows often lacks a CA bundle, so cURL error 60 blocks Bunny
        // locally. Skip verification only in `local` — production keeps TLS.
        $request = Http::withHeaders([
            'AccessKey' => (string) config('services.bunny.api_key'),
            'accept' => 'application/json',
        ])
            ->timeout(15)
            ->retry(2, 200);

        if (app()->environment('local')) {
            $request = $request->withoutVerifying();
        }

        return $request;
    }

    /**
     * @param  array<string, mixed>  $query
     * @return array<string, mixed>
     */
    private function getJson(string $url, array $query = []): array
    {
        $response = $this->client()->get($url, $query);

        if ($response->failed()) {
            throw new RuntimeException(
                'Bunny Stream request failed with status '.$response->status().'.'
            );
        }

        $payload = $response->json();

        return is_array($payload) ? $payload : [];
    }

    /**
     * Bunny's OpenAPI claims camelCase; some responses use PascalCase.
     *
     * @param  array<string, mixed>  $payload
     * @return list<array<string, mixed>>
     */
    private function itemsFrom(array $payload): array
    {
        $items = $payload['items'] ?? $payload['Items'] ?? [];

        return is_array($items) ? array_values($items) : [];
    }

    private function videosEndpoint(): string
    {
        return rtrim((string) config('services.bunny.base_url'), '/')
            .'/library/'.$this->libraryId().'/videos';
    }

    private function collectionsEndpoint(): string
    {
        return rtrim((string) config('services.bunny.base_url'), '/')
            .'/library/'.$this->libraryId().'/collections';
    }

    /**
     * @param  array<string, mixed>  $video
     * @return array<string, mixed>
     */
    private function transformVideo(array $video): array
    {
        $guid = (string) ($video['guid'] ?? $video['Guid'] ?? '');
        $thumbnail = (string) ($video['thumbnailFileName'] ?? $video['ThumbnailFileName'] ?? '');
        $pullZone = $video['pullZoneId'] ?? $video['PullZoneId'] ?? null;
        $collectionId = $video['collectionId'] ?? $video['CollectionId'] ?? null;

        return [
            'guid' => $guid,
            'title' => (string) ($video['title'] ?? $video['Title'] ?? 'Untitled video'),
            // Bunny reports whole seconds in `length`.
            'duration' => (int) ($video['length'] ?? $video['Length'] ?? 0),
            'status' => (int) ($video['status'] ?? $video['Status'] ?? 0),
            'is_ready' => (int) ($video['status'] ?? $video['Status'] ?? 0) === 4,
            'views' => (int) ($video['views'] ?? $video['Views'] ?? 0),
            'created_at' => $video['dateUploaded'] ?? $video['DateUploaded'] ?? null,
            'collection_id' => filled($collectionId) ? (string) $collectionId : null,
            'thumbnail_url' => $guid !== '' && $thumbnail !== '' && $pullZone
                ? sprintf('https://vz-%s.b-cdn.net/%s/%s', $pullZone, $guid, $thumbnail)
                : null,
        ];
    }

    /**
     * @param  array<string, mixed>  $collection
     * @return array{guid: string, name: string, video_count: int}
     */
    private function transformCollection(array $collection): array
    {
        return [
            'guid' => (string) ($collection['guid'] ?? $collection['Guid'] ?? ''),
            'name' => (string) ($collection['name'] ?? $collection['Name'] ?? 'Untitled collection'),
            'video_count' => (int) ($collection['videoCount'] ?? $collection['VideoCount'] ?? 0),
        ];
    }
}
