<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payment\CreateCheckoutSessionRequest;
use App\Http\Requests\Payment\CreatePaymentIntentRequest;
use App\Jobs\SendMetaCapiEvent;
use App\Models\Course;
use App\Models\Order;
use App\Models\User;
use App\Services\Checkout\CheckoutService;
use App\Services\Checkout\StripeEnrollmentService;
use App\Services\Student\EnrollmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\Checkout\Session;
use Stripe\Exception\ApiErrorException;
use Stripe\Exception\SignatureVerificationException;
use Stripe\PaymentIntent;
use Stripe\Stripe;
use Stripe\Webhook;
use Throwable;
use UnexpectedValueException;

class PaymentController extends Controller
{
    public function __construct(
        private readonly StripeEnrollmentService $enrollment,
        private readonly EnrollmentService $studentEnrollment,
        private readonly CheckoutService $checkoutPricing,
    ) {}

    /**
     * POST /api/v1/checkout — create a Stripe Checkout Session for a published course.
     */
    public function createCheckoutSession(CreateCheckoutSessionRequest $request): JsonResponse
    {
        try {
            $user = $request->user();
            $course = Course::query()->findOrFail((int) $request->validated('course_id'));

            if (! $course->is_published || ! $course->is_public) {
                return response()->json([
                    'success' => false,
                    'message' => 'The selected course is not available.',
                ], 404);
            }

            $unitAmount = (int) round(((float) $course->price) * 100);

            if ($unitAmount < 50) {
                return response()->json([
                    'success' => false,
                    'message' => 'This course cannot be purchased through Stripe Checkout.',
                ], 422);
            }

            $frontend = rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/');
            $secret = (string) config('services.stripe.secret');

            if ($secret === '') {
                return response()->json([
                    'success' => false,
                    'message' => 'Stripe is not configured.',
                ], 503);
            }

            Stripe::setApiKey($secret);

            $session = Session::create([
                'mode' => 'payment',
                'payment_method_types' => ['card'],
                'customer_email' => $user->email,
                'client_reference_id' => (string) $course->id,
                'line_items' => [[
                    'price_data' => [
                        'currency' => strtolower((string) ($course->currency ?: 'usd')),
                        'unit_amount' => $unitAmount,
                        'product_data' => [
                            'name' => $course->title ?: ($course->title_en ?: 'Course'),
                        ],
                    ],
                    'quantity' => 1,
                ]],
                'success_url' => $frontend.'/payment-success?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => $frontend.'/payment-cancel',
                'metadata' => [
                    'course_id' => (string) $course->id,
                    'user_id' => (string) $user->id,
                ],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Checkout session created.',
                'url' => $session->url,
                'data' => [
                    'id' => $session->id,
                    'url' => $session->url,
                ],
            ]);
        } catch (ApiErrorException $exception) {
            Log::error('Stripe checkout session failed.', [
                'message' => $exception->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unable to start Stripe Checkout. Please try again.',
            ], 502);
        } catch (Throwable $exception) {
            Log::error('Checkout session unexpected error.', [
                'message' => $exception->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unable to start checkout. Please try again.',
            ], 500);
        }
    }

    /**
     * POST /api/v1/checkout/create-payment-intent — guest Elements checkout.
     */
    public function createPaymentIntent(CreatePaymentIntentRequest $request): JsonResponse
    {
        try {
            $course = Course::query()->findOrFail((int) $request->validated('course_id'));

            if (! $course->is_published || ! $course->is_public) {
                return response()->json([
                    'success' => false,
                    'message' => 'The selected course is not available.',
                ], 404);
            }

            $authUser = $request->user('sanctum') ?? auth('sanctum')->user();
            if (
                $authUser
                && $this->studentEnrollment->isEnrolled((int) $authUser->id, (int) $course->id)
            ) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already own this course.',
                    'already_enrolled' => true,
                    'data' => [
                        'course_id' => $course->id,
                        'course_slug' => $course->slug,
                    ],
                ], 400);
            }

            $email = $request->validated('email');
            $owner = User::query()->where('email', $email)->first();
            if (
                $owner
                && $this->studentEnrollment->isEnrolled((int) $owner->id, (int) $course->id)
            ) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already own this course.',
                    'already_enrolled' => true,
                    'data' => [
                        'course_id' => $course->id,
                        'course_slug' => $course->slug,
                    ],
                ], 400);
            }

            $mode = $this->checkoutPricing->resolveMode(
                $course,
                $request->validated('mode') ?? null
            );
            $unitAmount = (int) round($this->checkoutPricing->resolveAmount($course, $mode) * 100);

            if ($unitAmount < 50) {
                return response()->json([
                    'success' => false,
                    'message' => 'This course cannot be purchased through Stripe.',
                ], 422);
            }

            $secret = (string) config('services.stripe.secret');
            if ($secret === '') {
                return response()->json([
                    'success' => false,
                    'message' => 'Stripe is not configured.',
                ], 503);
            }

            Stripe::setApiKey($secret);

            $name = $request->validated('name');
            $phone = $request->validated('phone');
            $anonymousId = (string) ($request->validated('anonymous_id') ?? '');

            $intent = PaymentIntent::create([
                'amount' => $unitAmount,
                'currency' => strtolower((string) ($course->currency ?: 'usd')),
                'automatic_payment_methods' => ['enabled' => true],
                'receipt_email' => $email,
                'description' => $course->title ?: ($course->title_en ?: 'Course purchase'),
                'metadata' => array_filter([
                    'course_id' => (string) $course->id,
                    'mode' => $mode,
                    'email' => $email,
                    'name' => $name,
                    'phone' => $phone,
                    // For Meta CAPI Purchase dedup + matching quality on webhook.
                    'anonymous_id' => $anonymousId !== '' ? $anonymousId : null,
                    'client_ip_address' => (string) ($request->ip() ?? ''),
                    'client_user_agent' => mb_substr((string) $request->userAgent(), 0, 500),
                ], static fn ($v) => $v !== null && $v !== ''),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Payment intent created.',
                'clientSecret' => $intent->client_secret,
                'data' => [
                    'client_secret' => $intent->client_secret,
                    'payment_intent_id' => $intent->id,
                    'amount' => $unitAmount,
                    'currency' => $intent->currency,
                    'mode' => $mode,
                ],
            ]);
        } catch (ApiErrorException $exception) {
            Log::error('Stripe payment intent failed.', [
                'message' => $exception->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unable to start payment. Please try again.',
            ], 502);
        } catch (Throwable $exception) {
            Log::error('Payment intent unexpected error.', [
                'message' => $exception->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unable to start payment. Please try again.',
            ], 500);
        }
    }

    /**
     * POST /api/v1/stripe/webhook (and /api/v1/webhooks/stripe).
     */
    public function webhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $signature = (string) $request->header('Stripe-Signature', '');
        $webhookSecret = (string) config('services.stripe.webhook_secret');

        if ($webhookSecret === '') {
            Log::error('Stripe webhook secret is not configured.');

            return response()->json([
                'success' => false,
                'message' => 'Webhook secret is not configured.',
            ], 500);
        }

        try {
            $event = Webhook::constructEvent($payload, $signature, $webhookSecret);
        } catch (UnexpectedValueException $exception) {
            Log::warning('Stripe webhook payload was invalid.', [
                'message' => $exception->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Invalid payload.',
            ], 400);
        } catch (SignatureVerificationException $exception) {
            Log::warning('Stripe webhook signature verification failed.', [
                'message' => $exception->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Invalid signature.',
            ], 400);
        } catch (Throwable $exception) {
            Log::error('Stripe webhook verification error.', [
                'message' => $exception->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Webhook verification failed.',
            ], 400);
        }

        try {
            if ($event->type === 'checkout.session.completed') {
                /** @var Session $session */
                $session = $event->data->object;
                $order = $this->enrollment->enrollFromCheckoutSession($session);

                if ($order === null) {
                    Log::error('Stripe checkout completed but enrollment metadata was invalid.', [
                        'session_id' => $session->id ?? null,
                        'metadata' => $session->metadata?->toArray() ?? [],
                    ]);

                    return response()->json([
                        'success' => false,
                        'message' => 'Enrollment metadata was invalid.',
                    ], 422);
                }

                $this->dispatchPurchaseCapiFromCheckoutSession($session, $order, $request);

                return response()->json([
                    'success' => true,
                    'received' => true,
                    'data' => [
                        'order_id' => $order->id,
                        'reference' => $order->reference,
                    ],
                ]);
            }

            if ($event->type === 'payment_intent.succeeded') {
                /** @var PaymentIntent $intent */
                $intent = $event->data->object;
                $order = $this->enrollment->enrollFromPaymentIntent($intent);

                if ($order === null) {
                    Log::error('Stripe payment_intent.succeeded but enrollment metadata was invalid.', [
                        'payment_intent_id' => $intent->id ?? null,
                        'metadata' => $intent->metadata?->toArray() ?? [],
                    ]);

                    return response()->json([
                        'success' => false,
                        'message' => 'Enrollment metadata was invalid.',
                    ], 422);
                }

                $this->dispatchPurchaseCapiFromPaymentIntent($intent, $order, $request);

                return response()->json([
                    'success' => true,
                    'received' => true,
                    'data' => [
                        'order_id' => $order->id,
                        'reference' => $order->reference,
                    ],
                ]);
            }

            return response()->json([
                'success' => true,
                'received' => true,
            ]);
        } catch (Throwable $exception) {
            Log::error('Stripe enrollment failed after webhook.', [
                'type' => $event->type ?? null,
                'message' => $exception->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Enrollment failed.',
            ], 500);
        }
    }

    /**
     * Meta CAPI Purchase — event_id = Stripe Checkout Session id (matches client).
     */
    private function dispatchPurchaseCapiFromCheckoutSession(
        Session $session,
        Order $order,
        Request $request,
    ): void {
        try {
            $eventId = (string) ($session->id ?? '');
            if ($eventId === '') {
                return;
            }

            $customer = $session->customer_details;
            $amountTotal = is_numeric($session->amount_total)
                ? round(((int) $session->amount_total) / 100, 2)
                : (float) $order->amount;
            $currency = strtoupper((string) ($session->currency ?: $order->currency ?: 'USD'));

            $metadata = $session->metadata?->toArray() ?? [];

            SendMetaCapiEvent::dispatch(
                'Purchase',
                $eventId,
                [
                    'email' => $customer?->email ?: $order->billing_email,
                    'phone' => $customer?->phone ?: $order->billing_phone,
                    'name' => trim(($order->billing_first_name ?? '').' '.($order->billing_last_name ?? '')),
                    'anonymous_id' => $metadata['anonymous_id'] ?? null,
                    'client_ip_address' => $metadata['client_ip_address'] ?? $request->ip(),
                    'client_user_agent' => $metadata['client_user_agent'] ?? (string) $request->userAgent(),
                ],
                [
                    'value' => $amountTotal,
                    'currency' => $currency,
                    'order_id' => (string) $order->id,
                    'content_ids' => [(string) $order->course_id],
                    'content_type' => 'product',
                    'num_items' => 1,
                ],
            )->afterResponse();
        } catch (Throwable $e) {
            Log::warning('Failed to dispatch Meta CAPI Purchase (checkout.session).', [
                'session_id' => $session->id ?? null,
                'message' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Meta CAPI Purchase — event_id = PaymentIntent id (matches client claim / success page).
     */
    private function dispatchPurchaseCapiFromPaymentIntent(
        PaymentIntent $intent,
        Order $order,
        Request $request,
    ): void {
        try {
            $eventId = (string) ($intent->id ?? '');
            if ($eventId === '') {
                return;
            }

            $metadata = $intent->metadata?->toArray() ?? [];
            $paidCents = (int) ($intent->amount_received ?: $intent->amount);
            $amount = $paidCents > 0
                ? round($paidCents / 100, 2)
                : (float) $order->amount;
            $currency = strtoupper((string) ($intent->currency ?: $order->currency ?: 'USD'));

            SendMetaCapiEvent::dispatch(
                'Purchase',
                $eventId,
                [
                    'email' => $metadata['email'] ?? $order->billing_email,
                    'phone' => $metadata['phone'] ?? $order->billing_phone,
                    'name' => $metadata['name'] ?? trim(($order->billing_first_name ?? '').' '.($order->billing_last_name ?? '')),
                    'anonymous_id' => $metadata['anonymous_id'] ?? null,
                    'client_ip_address' => $metadata['client_ip_address'] ?? $request->ip(),
                    'client_user_agent' => $metadata['client_user_agent'] ?? (string) $request->userAgent(),
                ],
                [
                    'value' => $amount,
                    'currency' => $currency,
                    'order_id' => (string) $order->id,
                    'content_ids' => [(string) ($metadata['course_id'] ?? $order->course_id)],
                    'content_type' => 'product',
                    'num_items' => 1,
                ],
            )->afterResponse();
        } catch (Throwable $e) {
            Log::warning('Failed to dispatch Meta CAPI Purchase (payment_intent).', [
                'payment_intent_id' => $intent->id ?? null,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
