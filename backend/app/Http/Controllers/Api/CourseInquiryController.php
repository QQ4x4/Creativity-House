<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CourseInquiry\StoreCourseInquiryRequest;
use App\Models\CourseInquiry;
use Illuminate\Http\JsonResponse;

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

        return response()->json([
            'success' => true,
            'message' => 'Thank you! Our team will reply to your course question within 24 hours.',
            'data' => [
                'id' => $inquiry->id,
                'status' => $inquiry->status,
            ],
        ], 201);
    }
}
