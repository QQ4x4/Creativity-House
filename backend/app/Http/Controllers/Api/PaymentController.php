<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payment\CreateCheckoutSessionRequest;
use App\Models\Course;
use App\Services\Checkout\StripeEnrollmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\Checkout\Session;
use Stripe\Exception\ApiErrorException;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Stripe;
use Stripe\Webhook;
use Throwable;
use UnexpectedValueException;

class PaymentController extends Controller
{
    public function __construct(private readonly StripeEnrollmentService $enrollment) {}

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
     * POST /api/v1/stripe/webhook — Stripe signature-verified enrollment.
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

        if ($event->type !== 'checkout.session.completed') {
            return response()->json([
                'success' => true,
                'received' => true,
            ]);
        }

        try {
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

            return response()->json([
                'success' => true,
                'received' => true,
                'data' => [
                    'order_id' => $order->id,
                    'reference' => $order->reference,
                ],
            ]);
        } catch (Throwable $exception) {
            Log::error('Stripe enrollment failed after checkout.session.completed.', [
                'message' => $exception->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Enrollment failed.',
            ], 500);
        }
    }
}
