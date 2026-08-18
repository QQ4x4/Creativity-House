<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\OrganizationInquiry\StoreOrganizationInquiryRequest;
use App\Models\OrganizationInquiry;
use Illuminate\Http\JsonResponse;

class OrganizationInquiryController extends Controller
{
    /**
     * POST /api/v1/organization-inquiries — public B2B lead capture.
     */
    public function store(StoreOrganizationInquiryRequest $request): JsonResponse
    {
        $inquiry = OrganizationInquiry::query()->create([
            ...$request->safe()->only([
                'name',
                'company_name',
                'email',
                'phone',
                'course_id',
                'message',
            ]),
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Thank you! Our corporate team will contact you within 24 hours.',
            'data' => [
                'id' => $inquiry->id,
                'status' => $inquiry->status,
            ],
        ], 201);
    }
}
