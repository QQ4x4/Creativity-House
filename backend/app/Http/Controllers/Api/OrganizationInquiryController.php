<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\OrganizationInquiry\StoreOrganizationInquiryRequest;
use App\Jobs\SendMetaCapiEvent;
use App\Models\OrganizationInquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

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

        $eventId = (string) ($request->input('event_id') ?? '');
        if ($eventId === '' || ! Str::isUuid($eventId)) {
            $eventId = (string) Str::uuid();
        }

        try {
            SendMetaCapiEvent::dispatch(
                'SubmitApplication',
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
                array_filter([
                    'content_name' => 'Organization Inquiry',
                    'company_name' => $inquiry->company_name,
                ], static fn ($v) => $v !== null && $v !== ''),
                $request->headers->get('referer'),
            )->afterResponse();
        } catch (Throwable $e) {
            Log::warning('Failed to dispatch Meta CAPI SubmitApplication.', [
                'inquiry_id' => $inquiry->id,
                'message' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Thank you! Our corporate team will contact you within 24 hours.',
            'data' => [
                'id' => $inquiry->id,
                'status' => $inquiry->status,
                'event_id' => $eventId,
            ],
        ], 201);
    }
}
