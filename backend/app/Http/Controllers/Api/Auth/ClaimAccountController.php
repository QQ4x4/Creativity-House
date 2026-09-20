<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ClaimAccountRequest;
use App\Models\Order;
use App\Services\AccountClaimOtpService;
use App\Services\Checkout\StripeEnrollmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Stripe\Exception\ApiErrorException;
use Stripe\PaymentIntent;
use Stripe\Stripe;
use Throwable;

class ClaimAccountController extends Controller
{
    public function __construct(
        private readonly AccountClaimOtpService $claimOtp,
        private readonly StripeEnrollmentService $enrollment,
    ) {}

    /**
     * POST /api/v1/auth/claim-account — activate a silent post-payment account.
     *
     * Buyer identity is resolved from the trusted order row for payment_intent_id
     * (never from a client-supplied email).
     */
    public function store(ClaimAccountRequest $request): JsonResponse
    {
        $paymentIntentId = $request->validated('payment_intent_id');
        $code = $request->validated('code');
        $password = $request->validated('password');

        $order = Order::query()
            ->with(['course', 'user'])
            ->where('stripe_payment_intent_id', $paymentIntentId)
            ->first();

        $user = $order?->user;

        if (
            ! $order
            || ! $user
            || $user->account_status !== StripeEnrollmentService::ACCOUNT_STATUS_PENDING_CLAIM
        ) {
            throw ValidationException::withMessages([
                'payment_intent_id' => ['No pending account claim was found for this payment.'],
            ]);
        }

        if (! $this->claimOtp->verify($user, $paymentIntentId, $code)) {
            throw ValidationException::withMessages([
                'code' => ['Invalid or expired verification code.'],
            ]);
        }

        // User model casts `password` => hashed — pass plaintext once.
        $user->forceFill([
            'password' => $password,
            'email_verified_at' => now(),
            'account_status' => StripeEnrollmentService::ACCOUNT_STATUS_ACTIVE,
            'is_active' => true,
            'verification_code' => null,
            'code_expires_at' => null,
        ])->save();

        $this->claimOtp->clear($paymentIntentId, $user);

        Auth::login($user, true);
        $request->session()->regenerate();

        $token = $user->createToken('account-claim')->plainTextToken;

        $course = $order->course;
        $slug = $course?->slug;

        return response()->json([
            'success' => true,
            'message' => 'Account activated successfully.',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'name' => $user->full_name,
                'email' => $user->email,
                'phone_number' => $user->phone_number,
                'avatar_url' => $user->avatarUrl(),
                'email_verified_at' => $user->email_verified_at,
                'is_active' => (bool) $user->is_active,
                'account_status' => $user->account_status,
                'is_admin' => $user->isAdmin(),
            ],
            'data' => [
                'course_slug' => $slug,
                'course_id' => $course?->id,
                'order_reference' => $order->reference,
            ],
        ]);
    }

    /**
     * POST /api/v1/auth/claim-account/resend — resend claim OTP (generic response).
     */
    public function resend(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payment_intent_id' => ['required', 'string', 'max:255'],
        ]);

        $paymentIntentId = trim($validated['payment_intent_id']);

        $order = Order::query()
            ->with(['course', 'user'])
            ->where('stripe_payment_intent_id', $paymentIntentId)
            ->first();

        $user = $order?->user;

        if (
            $user
            && $order
            && $user->account_status === StripeEnrollmentService::ACCOUNT_STATUS_PENDING_CLAIM
        ) {
            try {
                $courseTitle = (string) ($order->course?->title ?: $order->course?->title_en ?: 'your course');
                $this->claimOtp->issue($user, $paymentIntentId, $courseTitle);
            } catch (Throwable $e) {
                Log::error('Claim OTP resend failed.', [
                    'user_id' => $user->id,
                    'message' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'If a pending claim exists for this payment, a new code has been sent.',
        ]);
    }

    /**
     * GET /api/v1/checkout/claim-info — public order summary for the claim screen.
     *
     * Accepts Stripe redirect params: payment_intent, payment_intent_id, session_id.
     * Self-heals when the webhook has not yet created the local order.
     */
    public function claimInfo(Request $request): JsonResponse
    {
        $paymentIntentId = $this->resolvePaymentIntentId($request);

        if ($paymentIntentId === '') {
            return response()->json([
                'success' => false,
                'message' => 'A payment reference is required.',
            ], 422);
        }

        $order = $this->findOrderByPaymentIntent($paymentIntentId);

        if (! $order) {
            $order = $this->reconcileFromStripe($paymentIntentId);
        }

        if (! $order) {
            return response()->json([
                'success' => false,
                'message' => 'Payment confirmation is still processing. Please wait a moment.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->claimInfoPayload($order),
        ]);
    }

    private function resolvePaymentIntentId(Request $request): string
    {
        $candidates = [
            $request->query('payment_intent'),
            $request->query('payment_intent_id'),
            $request->query('session_id'),
        ];

        foreach ($candidates as $candidate) {
            $value = trim((string) $candidate);
            if ($value !== '' && str_starts_with($value, 'pi_')) {
                return $value;
            }
        }

        foreach ($candidates as $candidate) {
            $value = trim((string) $candidate);
            if ($value !== '') {
                return $value;
            }
        }

        return '';
    }

    private function findOrderByPaymentIntent(string $paymentIntentId): ?Order
    {
        return Order::query()
            ->with(['course:id,title,title_en,slug,cover_image', 'user:id,email,account_status,first_name'])
            ->where('stripe_payment_intent_id', $paymentIntentId)
            ->first();
    }

    /**
     * Pull a succeeded PaymentIntent from Stripe and run enrollment when the
     * local webhook has not created the order yet (common in local/dev).
     */
    private function reconcileFromStripe(string $paymentIntentId): ?Order
    {
        $secret = (string) config('services.stripe.secret');
        if ($secret === '') {
            Log::error('Claim-info reconciliation skipped: Stripe secret is not configured.', [
                'payment_intent_id' => $paymentIntentId,
            ]);

            return null;
        }

        try {
            Stripe::setApiKey($secret);
            $intent = PaymentIntent::retrieve($paymentIntentId);
        } catch (ApiErrorException $e) {
            Log::warning('Claim-info could not retrieve PaymentIntent from Stripe.', [
                'payment_intent_id' => $paymentIntentId,
                'message' => $e->getMessage(),
            ]);

            return null;
        } catch (Throwable $e) {
            Log::error('Claim-info Stripe retrieve failed unexpectedly.', [
                'payment_intent_id' => $paymentIntentId,
                'message' => $e->getMessage(),
            ]);

            return null;
        }

        if (($intent->status ?? '') !== 'succeeded') {
            Log::info('Claim-info PaymentIntent is not succeeded yet.', [
                'payment_intent_id' => $paymentIntentId,
                'status' => $intent->status ?? null,
            ]);

            return null;
        }

        try {
            $order = $this->enrollment->enrollFromPaymentIntent($intent);
        } catch (Throwable $e) {
            Log::error('Claim-info enrollment reconciliation failed.', [
                'payment_intent_id' => $paymentIntentId,
                'message' => $e->getMessage(),
            ]);

            return null;
        }

        if (! $order) {
            Log::error('Claim-info enrollment returned null (invalid metadata).', [
                'payment_intent_id' => $paymentIntentId,
                'metadata' => $intent->metadata?->toArray() ?? [],
            ]);

            return null;
        }

        return $this->findOrderByPaymentIntent($paymentIntentId) ?: $order->load([
            'course:id,title,title_en,slug,cover_image',
            'user:id,email,account_status,first_name',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function claimInfoPayload(Order $order): array
    {
        $order->loadMissing([
            'course:id,title,title_en,slug,cover_image',
            'user:id,email,account_status,first_name',
        ]);

        $user = $order->user;
        $requiresClaim = $user
            && $user->account_status === StripeEnrollmentService::ACCOUNT_STATUS_PENDING_CLAIM;

        return [
            'payment_intent_id' => $order->stripe_payment_intent_id,
            'order_reference' => $order->reference,
            'amount' => (float) $order->amount,
            'currency' => $order->currency ?: 'USD',
            'course' => [
                'id' => $order->course?->id,
                'title' => $order->course?->title ?: $order->course?->title_en,
                'slug' => $order->course?->slug,
                'cover_image' => $order->course?->cover_image,
            ],
            // Never expose the full purchaser email on this unauthenticated endpoint.
            'email' => $this->maskEmail($user?->email),
            'email_masked' => true,
            'requires_claim' => (bool) $requiresClaim,
            'already_active' => $user
                && $user->account_status === StripeEnrollmentService::ACCOUNT_STATUS_ACTIVE,
        ];
    }

    private function maskEmail(?string $email): ?string
    {
        if ($email === null) {
            return null;
        }

        $value = trim($email);
        if ($value === '') {
            return '';
        }

        $at = mb_strpos($value, '@');
        if ($at === false || $at < 1) {
            return '***';
        }

        $local = mb_substr($value, 0, $at);
        $domain = mb_substr($value, $at + 1);
        $visible = mb_substr($local, 0, min(2, mb_strlen($local)));
        $maskedLocal = $visible.str_repeat('*', max(mb_strlen($local) - mb_strlen($visible), 2));

        return $maskedLocal.'@'.$domain;
    }
}
