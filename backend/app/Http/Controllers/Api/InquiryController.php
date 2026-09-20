<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inquiry\StoreInquiryRequest;
use App\Mail\AdminInquiryAlertMail;
use App\Models\Inquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
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
