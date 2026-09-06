<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

/**
 * Generic multipart image upload for admin media fields (course cover,
 * instructor photo, etc.). Returns a permanent public-disk URL that the
 * editor stores on the course row.
 */
class ImageUploadController extends Controller
{
    /**
     * POST /api/v1/admin/upload-image
     */
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => [
                'required',
                'file',
                'max:5120', // 5 MB in kilobytes
                'mimes:jpeg,jpg,png,webp,svg',
            ],
        ]);

        /** @var \Illuminate\Http\UploadedFile $file */
        $file = $validated['file'];

        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg');
        $filename = Str::uuid()->toString().'.'.$extension;

        try {
            $path = $file->storeAs('uploads', $filename, 'public');
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Could not store the uploaded image. Please try again.',
            ], 500);
        }

        if (! is_string($path) || $path === '') {
            return response()->json([
                'message' => 'Could not store the uploaded image. Please try again.',
            ], 500);
        }

        $url = Storage::disk('public')->url($path);

        return response()->json([
            'data' => [
                'url' => $url,
                'path' => $path,
                'filename' => $filename,
            ],
        ], 201);
    }
}
