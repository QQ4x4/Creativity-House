<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Checkout\CheckoutProcessRequest;
use App\Services\Checkout\CheckoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class CheckoutController extends Controller
{
    public function __construct(private readonly CheckoutService $checkout) {}

    /**
     * POST /api/v1/checkout — mock-complete a catalog purchase.
     * Auth is optional: guests are linked by email.
     */
    public function store(CheckoutProcessRequest $request): JsonResponse
    {
        $wasGuest = $request->user() === null;

        $result = $this->checkout->process(
            $request->safe()->only([
                'first_name',
                'last_name',
                'email',
                'phone_number',
                'country',
                'course_id',
                'course_slug',
                'mode',
            ]),
            $request->user()
        );

        $sessionStarted = false;

        if ($wasGuest && $result['created_user'] && $request->hasSession()) {
            Auth::login($result['user']);
            $request->session()->regenerate();
            $sessionStarted = true;
        }

        $order = $result['order'];

        return response()->json([
            'success' => true,
            'status' => 'completed',
            'message' => $result['already_enrolled']
                ? 'You already have access to this course.'
                : 'Payment recorded. Your course is ready.',
            'already_enrolled' => $result['already_enrolled'],
            'requires_login' => $wasGuest && ! $sessionStarted,
            'session_started' => $sessionStarted,
            'order' => [
                'order_id' => $order->reference,
                'course_id' => $order->course_id,
                'amount' => (float) $order->amount,
                'currency' => $order->currency,
                'mode' => $order->delivery_mode,
                'status' => 'completed',
            ],
        ]);
    }
}
