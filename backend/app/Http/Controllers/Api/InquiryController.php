<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inquiry\StoreInquiryRequest;
use App\Jobs\SendMetaCapiEvent;
use App\Mail\AdminInquiryAlertMail;
use App\Models\Inquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

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

        $eventId = (string) ($request->validated('event_id') ?? '');
        if ($eventId === '') {
            $eventId = (string) Str::uuid();
        }

        $anonymousId = $request->validated('anonymous_id');
        $isOrganization = $inquiry->type === Inquiry::TYPE_ORGANIZATION;

        // Meta CAPI (async) — same event_id as browser dataLayer for dedup.
        try {
            SendMetaCapiEvent::dispatch(
                $isOrganization ? 'SubmitApplication' : 'Lead',
                $eventId,
                [
                    'email' => $inquiry->email,
                    'phone' => $inquiry->phone_number,
                    'name' => $inquiry->full_name,
                    'anonymous_id' => is_string($anonymousId) ? $anonymousId : null,
                    'client_ip_address' => $request->ip(),
                    'client_user_agent' => (string) $request->userAgent(),
                    'fbp' => $request->cookie('_fbp'),
                    'fbc' => $request->cookie('_fbc'),
                ],
                array_filter([
                    'content_name' => $isOrganization ? 'Organization Inquiry' : 'Course Inquiry',
                    'content_category' => $inquiry->type,
                    'company_name' => $inquiry->company_name,
                ], static fn ($v) => $v !== null && $v !== ''),
                $request->headers->get('referer'),
            )->afterResponse();
        } catch (Throwable $e) {
            Log::warning('Failed to dispatch Meta CAPI inquiry event.', [
                'inquiry_id' => $inquiry->id,
                'message' => $e->getMessage(),
            ]);
        }

        $recipient = (string) config(
            'mail.contact_form_recipient',
            'ahmed@creativity-house.com'
        );

        // Queue after the HTTP response so local sync queues / slow SMTP
        // cannot freeze the request (previously ~19s hangs).
        $inquiryId = $inquiry->id;
        $replyEmail = $inquiry->email;
        $replyName = $inquiry->full_name;

        dispatch(function () use ($inquiryId, $recipient, $replyEmail, $replyName): void {
            try {
                $inquiry = Inquiry::query()->find($inquiryId);
                if (! $inquiry) {
                    return;
                }

                Mail::to($recipient)->queue(
                    (new AdminInquiryAlertMail($inquiry))
                        ->replyTo($replyEmail, $replyName)
                );
            } catch (Throwable $e) {
                Log::error('Failed to queue admin inquiry alert mail.', [
                    'inquiry_id' => $inquiryId,
                    'recipient' => $recipient,
                    'message' => $e->getMessage(),
                ]);
            }
        })->afterResponse();

        $message = $isOrganization
            ? 'Thank you! Our corporate team will contact you within 24 hours.'
            : 'Thank you! Our team will reply to your course question within 24 hours.';

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => [
                'id' => $inquiry->id,
                'status' => $inquiry->status,
                'type' => $inquiry->type,
                'event_id' => $eventId,
            ],
        ], 201);
    }
}
