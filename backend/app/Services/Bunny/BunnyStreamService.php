<?php

namespace App\Services\Bunny;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Thin read-only wrapper over the Bunny Stream API.
 *
 * Only the admin video picker (and Success Stories) consume this. Responses are
 * cached briefly so opening the media library does not hammer Bunny's rate limit.
 * The AccessKey never leaves the server.
 */
class BunnyStreamService
{
    private const CACHE_TTL_SECONDS = 120;

    private const MAX_PER_PAGE = 100;

    /** Default signed embed / playback TTL for public testimonials. */
    private const SIGNED_TTL_SECONDS = 21600; // 6 hours

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
        $pullZoneId = $this->pullZoneId();

        $cacheKey = sprintf('bunny:videos:%s:%s:%d:%d', $this->libraryId(), md5($search), $page, $perPage);

        return Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($search, $page, $perPage, $pullZoneId): array {
            $payload = $this->getJson($this->videosEndpoint(), array_filter([
                'page' => $page,
                'itemsPerPage' => $perPage,
                'search' => $search !== '' ? $search : null,
                'orderBy' => 'date',
            ], static fn ($value) => $value !== null));

            $items = $this->itemsFrom($payload);

            return [
                'videos' => array_values(array_map(
                    fn (array $video) => $this->transformVideo($video, $pullZoneId),
                    $items
                )),
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

    /**
     * Fetch a single video (uncached) — used when creating a testimonial row.
     *
     * @return array<string, mixed>|null
     */
    public function video(string $guid): ?array
    {
        if (! $this->isConfigured() || $guid === '') {
            return null;
        }

        try {
            $response = $this->client()->get($this->videosEndpoint().'/'.$guid);
        } catch (\Throwable) {
            return null;
        }

        if ($response->failed()) {
            return null;
        }

        $payload = $response->json();
        if (! is_array($payload) || $payload === []) {
            return null;
        }

        return $this->transformVideo($payload, $this->pullZoneId());
    }

    /**
     * Public Bunny thumbnail URL for a video GUID (no secrets).
     */
    public function thumbnailUrl(string $guid, ?string $thumbnailFileName = 'thumbnail.jpg'): ?string
    {
        $guid = trim($guid);
        if ($guid === '') {
            return null;
        }

        $file = filled($thumbnailFileName) ? $thumbnailFileName : 'thumbnail.jpg';
        $cdnHost = $this->cdnHostname();

        if ($cdnHost !== null) {
            return sprintf('https://%s/%s/%s', $cdnHost, $guid, $file);
        }

        $pullZoneId = $this->pullZoneId();
        if ($pullZoneId === null) {
            return null;
        }

        return sprintf('https://vz-%s.b-cdn.net/%s/%s', $pullZoneId, $guid, $file);
    }

    /**
     * Embed URL for the iframe player. When token authentication is configured
     * on the library, a SHA256-signed token + expiry is appended so logged-out
     * visitors can still play public testimonials.
     */
    public function signedEmbedUrl(string $videoId, bool $autoplay = false, ?int $ttlSeconds = null): string
    {
        $libraryId = $this->libraryId();
        $base = sprintf(
            'https://iframe.mediadelivery.net/embed/%s/%s',
            rawurlencode($libraryId),
            rawurlencode($videoId)
        );

        $query = [
            'autoplay' => $autoplay ? 'true' : 'false',
            'preload' => 'true',
            'responsive' => 'true',
        ];

        $tokenKey = (string) config('services.bunny.token_auth_key', '');
        if ($tokenKey !== '') {
            $expires = time() + max(60, $ttlSeconds ?? self::SIGNED_TTL_SECONDS);
            $query['token'] = hash('sha256', $tokenKey.$videoId.$expires);
            $query['expires'] = (string) $expires;
        }

        return $base.'?'.http_build_query($query);
    }

    /**
     * Resolve orientation from Bunny width/height.
     */
    public function orientationFromDimensions(?int $width, ?int $height): string
    {
        if ($width && $height && $height > $width) {
            return 'portrait';
        }

        return 'landscape';
    }

    /**
     * @return array{pull_zone_id: ?string, cdn_hostname: ?string}
     */
    public function libraryMeta(): array
    {
        return [
            'pull_zone_id' => $this->pullZoneId(),
            'cdn_hostname' => $this->cdnHostname(),
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
            // Fourth arg `false`: do not throw RequestException on 4xx/5xx —
            // callers check failed() / catch RuntimeException instead.
            ->retry(2, 200, null, false);

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
        try {
            $response = $this->client()->get($url, $query);
        } catch (\Throwable $exception) {
            throw new RuntimeException(
                'Bunny Stream request failed: '.$exception->getMessage(),
                0,
                $exception
            );
        }

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

    private function libraryEndpoint(): string
    {
        return rtrim((string) config('services.bunny.base_url'), '/')
            .'/library/'.$this->libraryId();
    }

    /**
     * Pull zone id from env override, then Bunny library metadata.
     */
    private function pullZoneId(): ?string
    {
        $configured = trim((string) config('services.bunny.pull_zone_id', ''));
        if ($configured !== '') {
            return $configured;
        }

        $meta = $this->cachedLibraryPayload();
        $id = $meta['pullZoneId'] ?? $meta['PullZoneId'] ?? null;

        return filled($id) ? (string) $id : null;
    }

    private function cdnHostname(): ?string
    {
        $configured = trim((string) config('services.bunny.cdn_hostname', ''));
        if ($configured !== '') {
            return preg_replace('#^https?://#', '', rtrim($configured, '/'));
        }

        $meta = $this->cachedLibraryPayload();
        $host = $meta['cdnHostname'] ?? $meta['CdnHostname'] ?? null;

        if (filled($host)) {
            return preg_replace('#^https?://#', '', rtrim((string) $host, '/'));
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private function cachedLibraryPayload(): array
    {
        if (! $this->isConfigured()) {
            return [];
        }

        $cacheKey = 'bunny:library:'.$this->libraryId();

        return Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function (): array {
            try {
                return $this->getJson($this->libraryEndpoint());
            } catch (RuntimeException) {
                return [];
            }
        });
    }

    /**
     * @param  array<string, mixed>  $video
     * @return array<string, mixed>
     */
    private function transformVideo(array $video, ?string $libraryPullZoneId = null): array
    {
        $guid = (string) ($video['guid'] ?? $video['Guid'] ?? '');
        $thumbnail = (string) ($video['thumbnailFileName'] ?? $video['ThumbnailFileName'] ?? 'thumbnail.jpg');
        if ($thumbnail === '') {
            $thumbnail = 'thumbnail.jpg';
        }

        $videoPullZone = $video['pullZoneId'] ?? $video['PullZoneId'] ?? null;
        $pullZone = filled($videoPullZone) ? (string) $videoPullZone : $libraryPullZoneId;
        $collectionId = $video['collectionId'] ?? $video['CollectionId'] ?? null;
        $width = isset($video['width']) || isset($video['Width'])
            ? (int) ($video['width'] ?? $video['Width'])
            : null;
        $height = isset($video['height']) || isset($video['Height'])
            ? (int) ($video['height'] ?? $video['Height'])
            : null;

        $directThumb = $video['thumbnailUrl'] ?? $video['ThumbnailUrl'] ?? null;
        $thumbnailUrl = null;
        if (filled($directThumb) && is_string($directThumb)) {
            $thumbnailUrl = $directThumb;
        } elseif ($guid !== '') {
            $cdnHost = $this->cdnHostname();
            if ($cdnHost !== null) {
                $thumbnailUrl = sprintf('https://%s/%s/%s', $cdnHost, $guid, $thumbnail);
            } elseif ($pullZone) {
                $thumbnailUrl = sprintf('https://vz-%s.b-cdn.net/%s/%s', $pullZone, $guid, $thumbnail);
            }
        }

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
            'thumbnail_url' => $thumbnailUrl,
            'width' => $width,
            'height' => $height,
            'orientation' => $this->orientationFromDimensions($width, $height),
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
