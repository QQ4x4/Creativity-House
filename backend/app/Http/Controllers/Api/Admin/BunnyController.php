<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\Bunny\BunnyStreamService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * Secure proxy for the admin video picker.
 *
 * Bunny's AccessKey grants full read/write over the library, so it stays
 * server-side; the browser only ever sees the reduced video + collection list.
 */
class BunnyController extends Controller
{
    public function __construct(
        private readonly BunnyStreamService $bunny,
    ) {}

    /**
     * GET /api/v1/admin/bunny/videos?search=&page=&per_page=
     *
     * Returns videos (with collection_id) plus the library's collections so the
     * frontend can render collection tabs / grouped grids.
     */
    public function videos(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:200'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        if (! $this->bunny->isConfigured()) {
            return response()->json([
                'message' => 'Bunny Stream is not configured on this environment.',
                'configured' => false,
                'data' => [],
                'collections' => [],
                'meta' => ['total' => 0, 'page' => 1, 'per_page' => 0, 'library_id' => null],
            ], 503);
        }

        try {
            $result = $this->bunny->library(
                (string) ($validated['search'] ?? ''),
                (int) ($validated['page'] ?? 1),
                (int) ($validated['per_page'] ?? 100),
            );
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'configured' => true,
                'data' => [],
                'collections' => [],
                'meta' => ['total' => 0, 'page' => 1, 'per_page' => 0, 'library_id' => $this->bunny->libraryId()],
            ], 502);
        }

        return response()->json([
            'configured' => true,
            'data' => $result['videos'],
            'collections' => $result['collections'],
            'meta' => [
                'total' => $result['total'],
                'page' => $result['page'],
                'per_page' => $result['per_page'],
                'library_id' => $this->bunny->libraryId(),
            ],
        ]);
    }
}
