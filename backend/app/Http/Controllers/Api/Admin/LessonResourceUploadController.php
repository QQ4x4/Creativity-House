<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\LessonResourceUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * Multipart upload for lesson attachments. The curriculum sync payload then
 * stores the returned URL/path metadata — it never accepts raw files itself.
 */
class LessonResourceUploadController extends Controller
{
    public function __construct(
        private readonly LessonResourceUploadService $uploads,
    ) {}

    /**
     * POST /api/v1/admin/lesson-resources/upload
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => [
                'required',
                'file',
                'max:51200', // 50 MB in kilobytes
                'mimes:ogg,oga,mp3,wav,m4a,aac,flac,pdf,doc,docx,zip,rar,xlsx,xls,png,jpg,jpeg,webp',
            ],
            'title' => ['nullable', 'string', 'max:200'],
        ]);

        try {
            $resource = $this->uploads->store(
                $validated['file'],
                $validated['title'] ?? null,
            );
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'data' => $resource,
        ], 201);
    }
}
