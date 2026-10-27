<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

/**
 * Turn a stored media path (or absolute URL) into a browser-usable URL.
 *
 * Rules:
 * - Full http(s) URL to an external host → keep as is.
 * - Full http(s) URL on our API host under /storage/ → rewrite onto APP_URL.
 * - Full http(s) URL on our API host that is NOT /storage/ (e.g. /images/…)
 *   → return the root-relative path so the frontend origin serves it.
 * - Root-relative /storage/… → absolute API storage URL.
 * - Other root-relative paths (/images/…, /fonts/…) → keep as is (frontend).
 * - Relative Laravel disk paths (uploads/…, storage/…) → absolute API storage URL.
 */
final class PublicMediaUrl
{
    public static function resolve(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim($value);

        if ($value === '') {
            return null;
        }

        $appUrl = rtrim((string) config('app.url'), '/');

        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://')) {
            $path = parse_url($value, PHP_URL_PATH);
            $host = parse_url($value, PHP_URL_HOST);
            $appHost = parse_url($appUrl, PHP_URL_HOST);

            if (is_string($path) && str_starts_with($path, '/storage/')) {
                $query = parse_url($value, PHP_URL_QUERY);

                return $appUrl.$path.($query ? '?'.$query : '');
            }

            // Our API host but a frontend asset path — strip to root-relative
            // so the browser loads it from the Next.js origin, not the API.
            if (
                is_string($path)
                && str_starts_with($path, '/')
                && is_string($host)
                && is_string($appHost)
                && strcasecmp($host, $appHost) === 0
            ) {
                return $path;
            }

            return $value;
        }

        // Already a site-root path.
        if (str_starts_with($value, '/')) {
            if (str_starts_with($value, '/storage/')) {
                return $appUrl.$value;
            }

            // Frontend assets (/images/…, etc.) — leave for the website origin.
            return $value;
        }

        // Relative public-disk paths: uploads/…, course-covers/…, etc.
        // Also accept a bare "storage/…" prefix from older rows.
        $diskPath = str_starts_with($value, 'storage/')
            ? substr($value, strlen('storage/'))
            : $value;

        $storageUrl = Storage::disk('public')->url($diskPath);

        if (str_starts_with($storageUrl, 'http://') || str_starts_with($storageUrl, 'https://')) {
            $path = parse_url($storageUrl, PHP_URL_PATH);
            if (is_string($path) && str_starts_with($path, '/storage/')) {
                return $appUrl.$path;
            }

            return $storageUrl;
        }

        $relative = str_starts_with($storageUrl, '/') ? $storageUrl : '/'.$storageUrl;

        return $appUrl.$relative;
    }
}
