<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CourseInquiry\StoreCourseInquiryRequest;
use App\Jobs\SendMetaCapiEvent;
use App\Models\CourseInquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class CourseInquiryController extends Controller
{
    /**
     * POST /api/v1/course-inquiries — public individual course question capture.
     */
    public function store(StoreCourseInquiryRequest $request): JsonResponse
    {
        $inquiry = CourseInquiry::query()->create([
            ...$request->safe()->only([
                'name',
                'email',
                'phone',
                'course_id',
                'message',
            ]),
            'status' => 'pending',
        ]);

        $eventId = (string) ($request->input('event_id') ?? '');
        if ($eventId === '' || ! Str::isUuid($eventId)) {
            $eventId = (string) Str::uuid();
        }

        try {
            SendMetaCapiEvent::dispatch(
                'Lead',
                $eventId,
                [
                    'email' => $inquiry->email,
                    'phone' => $inquiry->phone,
                    'name' => $inquiry->name,
                    'anonymous_id' => $request->input('anonymous_id'),
                    'client_ip_address' => $request->ip(),
                    'client_user_agent' => (string) $request->userAgent(),
                    'fbp' => $request->cookie('_fbp'),
                    'fbc' => $request->cookie('_fbc'),
                ],
                [
                    'content_name' => 'Course Inquiry',
                ],
                $request->headers->get('referer'),
            )->afterResponse();
        } catch (Throwable $e) {
            Log::warning('Failed to dispatch Meta CAPI Lead.', [
                'inquiry_id' => $inquiry->id,
                'message' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Thank you! Our team will reply to your course question within 24 hours.',
            'data' => [
                'id' => $inquiry->id,
                'status' => $inquiry->status,
                'event_id' => $eventId,
            ],
        ], 201);
    }
}
