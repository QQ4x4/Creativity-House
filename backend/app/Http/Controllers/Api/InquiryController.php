<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inquiry\StoreInquiryRequest;
use App\Models\Inquiry;
use Illuminate\Http\JsonResponse;

class InquiryController extends Controller
{
    /**
     * POST /api/v1/inquiries — public lead capture (student + organization).
     */
    public function store(StoreInquiryRequest $request): JsonResponse
    {
        $data = $request->safe()->only([
            'type',
            'full_name',
            'email',
            'phone_number',
            'company_name',
            'target_course',
            'message',
        ]);

        $inquiry = Inquiry::query()->create([
            ...$data,
            'status' => Inquiry::STATUS_UNREAD,
        ]);

        $message = $inquiry->type === Inquiry::TYPE_ORGANIZATION
            ? 'Thank you! Our corporate team will contact you within 24 hours.'
            : 'Thank you! Our team will reply to your course question within 24 hours.';

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => [
                'id' => $inquiry->id,
                'status' => $inquiry->status,
                'type' => $inquiry->type,
            ],
        ], 201);
    }
}
