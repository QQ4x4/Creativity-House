<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReplyInquiryRequest;
use App\Http\Resources\Admin\InquiryResource;
use App\Mail\InquiryReplyMail;
use App\Models\Inquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Mail;

class InquiryController extends Controller
{
    /**
     * GET /api/v1/admin/inquiries
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $type = $request->query('type');
        $status = $request->query('status');
        $search = trim((string) $request->query('search', ''));
        $perPage = min(max((int) $request->query('per_page', 50), 1), 100);

        $inquiries = Inquiry::query()
            ->ofType(is_string($type) ? $type : null)
            ->ofStatus(is_string($status) ? $status : null)
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.$search.'%';
                $query->where(function ($inner) use ($like) {
                    $inner->where('full_name', 'like', $like)
                        ->orWhere('email', 'like', $like)
                        ->orWhere('company_name', 'like', $like)
                        ->orWhere('target_course', 'like', $like)
                        ->orWhere('message', 'like', $like);
                });
            })
            ->orderByRaw("CASE status WHEN 'unread' THEN 0 WHEN 'read' THEN 1 ELSE 2 END")
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return InquiryResource::collection($inquiries);
    }

    /**
     * GET /api/v1/admin/inquiries/{inquiry}
     * Marks unread inquiries as read when opened.
     */
    public function show(Inquiry $inquiry): InquiryResource
    {
        $inquiry->markReadIfUnread();
        $inquiry->refresh();

        return new InquiryResource($inquiry);
    }

    /**
     * POST /api/v1/admin/inquiries/{inquiry}/reply
     */
    public function reply(ReplyInquiryRequest $request, Inquiry $inquiry): JsonResponse
    {
        $subject = $request->validated('subject');
        $body = $request->validated('message');

        Mail::to($inquiry->email)->send(new InquiryReplyMail(
            inquiry: $inquiry,
            replyBody: $body,
            replySubject: is_string($subject) && $subject !== '' ? $subject : null,
        ));

        $inquiry->forceFill([
            'status' => Inquiry::STATUS_REPLIED,
            'replied_at' => now(),
        ])->save();

        return response()->json([
            'success' => true,
            'message' => 'Reply sent successfully.',
            'data' => new InquiryResource($inquiry->fresh()),
        ]);
    }
}
