<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LessonResource;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Forces a browser download for lesson attachment files.
 */
class LessonResourceController extends Controller
{
    /**
     * GET /api/v1/resources/{id}/download
     */
    public function download(int $id): StreamedResponse|RedirectResponse
    {
        /** @var LessonResource $resource */
        $resource = LessonResource::query()->findOrFail($id);

        // External links open in a new tab from the client; if hit directly, redirect.
        if ($resource->type === LessonResource::TYPE_LINK) {
            abort_unless(filled($resource->url), 404);

            return redirect()->away($resource->url);
        }

        $path = (string) ($resource->file_path ?: '');

        // Fall back to a relative public-disk path stored in `url`.
        if ($path === '' && filled($resource->url) && ! str_starts_with((string) $resource->url, 'http')) {
            $path = ltrim((string) $resource->url, '/');
            if (str_starts_with($path, 'storage/')) {
                $path = substr($path, strlen('storage/'));
            }
        }

        abort_unless($path !== '' && Storage::disk('public')->exists($path), 404);

        $downloadName = $resource->title ?: basename($path);

        // Preserve the real extension when the title has none (e.g. "Lecture Slides").
        $extension = pathinfo($path, PATHINFO_EXTENSION);
        if ($extension !== '' && pathinfo($downloadName, PATHINFO_EXTENSION) === '') {
            $downloadName .= '.'.$extension;
        }

        return Storage::disk('public')->download($path, $downloadName);
    }
}
