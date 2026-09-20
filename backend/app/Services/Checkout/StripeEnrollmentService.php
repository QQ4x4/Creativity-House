<?php

namespace App\Services\Checkout;

use App\Enums\PaymentStatus;
use App\Models\Course;
use App\Models\Order;
use App\Models\User;
use App\Services\AccountClaimOtpService;
use App\Services\Student\ProgressService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Stripe\Checkout\Session as StripeSession;
use Stripe\PaymentIntent;
use Throwable;

class StripeEnrollmentService
{
    public const ACCOUNT_STATUS_ACTIVE = 'active';

    public const ACCOUNT_STATUS_PENDING_CLAIM = 'pending_claim';

    public function __construct(
        private readonly ProgressService $progress,
        private readonly AccountClaimOtpService $claimOtp,
        private readonly CheckoutService $checkoutPricing,
    ) {}

    /**
     * Idempotently enroll the buyer after Stripe confirms payment.
     * A paid order is the enrollment record.
     */
    public function enrollFromCheckoutSession(StripeSession $session): ?Order
    {
        $userId = (int) ($session->metadata['user_id'] ?? 0);
        $courseId = (int) ($session->metadata['course_id'] ?? 0);

        if ($userId < 1 || $courseId < 1) {
            return null;
        }

        $user = User::query()->find($userId);
        $course = Course::query()->find($courseId);

        if ($user === null || $course === null) {
            return null;
        }

        return DB::transaction(function () use ($session, $user, $course): Order {
            $existingBySession = Order::query()
                ->where('stripe_session_id', $session->id)
                ->lockForUpdate()
                ->first();

            if ($existingBySession) {
                if ($existingBySession->payment_status !== PaymentStatus::Paid) {
                    $existingBySession->update([
                        'payment_status' => PaymentStatus::Paid,
                        'paid_at' => $existingBySession->paid_at ?? now(),
                    ]);
                }

                $this->progress->progressFor($user, $course);

                return $existingBySession->refresh();
            }

            $existingPaid = Order::query()
                ->where('user_id', $user->id)
                ->where('course_id', $course->id)
                ->where('payment_status', PaymentStatus::Paid->value)
                ->lockForUpdate()
                ->first();

            if ($existingPaid) {
                if (blank($existingPaid->stripe_session_id)) {
                    $existingPaid->update(['stripe_session_id' => $session->id]);
                }

                $this->progress->progressFor($user, $course);

                return $existingPaid;
            }

            $amountTotal = $session->amount_total;
            $amount = is_numeric($amountTotal)
                ? round(((int) $amountTotal) / 100, 2)
                : round((float) $course->price, 2);

            $currency = strtoupper((string) ($session->currency ?: $course->currency ?: 'USD'));
            $customer = $session->customer_details;

            $order = Order::query()->create([
                'user_id' => $user->id,
                'course_id' => $course->id,
                'stripe_session_id' => $session->id,
                'amount' => $amount,
                'currency' => $currency,
                'payment_status' => PaymentStatus::Paid,
                'paid_at' => now(),
                'billing_email' => $customer?->email ?? $user->email,
                'billing_first_name' => $user->first_name,
                'billing_last_name' => $user->last_name,
                'billing_phone' => $customer?->phone ?? $user->phone_number,
                'delivery_mode' => $course->default_mode ?: 'live',
            ]);

            $this->progress->progressFor($user, $course);

            return $order;
        });
    }

    /**
     * Scenario 3: enroll after PaymentIntent succeeds (guest Elements checkout).
     * Existing emails enroll immediately; new emails get a silent pending_claim user + OTP.
     */
    public function enrollFromPaymentIntent(PaymentIntent $intent): ?Order
    {
        $metadata = $intent->metadata?->toArray() ?? [];
        $courseId = (int) ($metadata['course_id'] ?? 0);
        $email = mb_strtolower(trim((string) ($metadata['email'] ?? '')));
        $name = trim((string) ($metadata['name'] ?? ''));
        $phone = trim((string) ($metadata['phone'] ?? ''));
        $requestedMode = isset($metadata['mode']) ? trim((string) $metadata['mode']) : null;

        if ($courseId < 1 || $email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return null;
        }

        $course = Course::query()->find($courseId);
        if ($course === null) {
            return null;
        }

        // Idempotent replay: return existing enrollment before publish/amount guards.
        $existingByIntent = Order::query()
            ->where('stripe_payment_intent_id', $intent->id)
            ->first();

        if ($existingByIntent) {
            return DB::transaction(function () use ($intent, $course, $existingByIntent): Order {
                $locked = Order::query()
                    ->whereKey($existingByIntent->id)
                    ->lockForUpdate()
                    ->first();

                if ($locked && $locked->payment_status !== PaymentStatus::Paid) {
                    $locked->update([
                        'payment_status' => PaymentStatus::Paid,
                        'paid_at' => $locked->paid_at ?? now(),
                    ]);
                }

                $user = $locked?->user;
                if ($user) {
                    $this->progress->progressFor($user, $course);
                }

                return ($locked ?? $existingByIntent)->refresh();
            });
        }

        if (! $course->is_published || ! $course->is_public) {
            Log::warning('Refusing enrollment for unpublished or private course.', [
                'payment_intent_id' => $intent->id,
                'course_id' => $course->id,
                'is_published' => (bool) $course->is_published,
                'is_public' => (bool) $course->is_public,
            ]);

            return null;
        }

        $mode = $this->checkoutPricing->resolveMode($course, $requestedMode);
        $expectedCents = (int) round($this->checkoutPricing->resolveAmount($course, $mode) * 100);
        $paidCents = (int) ($intent->amount_received ?: $intent->amount);

        if ($paidCents !== $expectedCents) {
            Log::error('PaymentIntent amount mismatch — refusing enrollment.', [
                'payment_intent_id' => $intent->id,
                'course_id' => $course->id,
                'mode' => $mode,
                'expected_cents' => $expectedCents,
                'paid_cents' => $paidCents,
            ]);

            return null;
        }

        [$firstName, $lastName] = $this->splitName($name);

        return DB::transaction(function () use ($intent, $course, $email, $firstName, $lastName, $phone, $name, $mode, $paidCents): Order {
            $existingByIntent = Order::query()
                ->where('stripe_payment_intent_id', $intent->id)
                ->lockForUpdate()
                ->first();

            if ($existingByIntent) {
                if ($existingByIntent->payment_status !== PaymentStatus::Paid) {
                    $existingByIntent->update([
                        'payment_status' => PaymentStatus::Paid,
                        'paid_at' => $existingByIntent->paid_at ?? now(),
                    ]);
                }

                $user = $existingByIntent->user;
                if ($user) {
                    $this->progress->progressFor($user, $course);
                }

                return $existingByIntent->refresh();
            }

            $isNewUser = false;
            $user = User::query()->where('email', $email)->lockForUpdate()->first();

            if ($user === null) {
                $isNewUser = true;
                $user = User::query()->create([
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'name' => $name !== '' ? $name : trim("{$firstName} {$lastName}"),
                    'email' => $email,
                    'phone_number' => $phone !== '' ? $phone : null,
                    'password' => Str::random(40),
                    'email_verified_at' => null,
                    'is_active' => true,
                    'account_status' => self::ACCOUNT_STATUS_PENDING_CLAIM,
                ]);
            } else {
                $updates = [];
                if (blank($user->phone_number) && $phone !== '') {
                    $updates['phone_number'] = $phone;
                }
                if (blank($user->first_name) && $firstName !== '') {
                    $updates['first_name'] = $firstName;
                }
                if (blank($user->last_name) && $lastName !== '') {
                    $updates['last_name'] = $lastName;
                }
                if ($updates !== []) {
                    $user->forceFill($updates)->save();
                }
            }

            $existingPaid = Order::query()
                ->where('user_id', $user->id)
                ->where('course_id', $course->id)
                ->where('payment_status', PaymentStatus::Paid->value)
                ->lockForUpdate()
                ->first();

            $amount = round($paidCents / 100, 2);
            $currency = strtoupper((string) ($intent->currency ?: $course->currency ?: 'USD'));

            if ($existingPaid) {
                if (blank($existingPaid->stripe_payment_intent_id)) {
                    $existingPaid->update([
                        'stripe_payment_intent_id' => $intent->id,
                        'billing_email' => $existingPaid->billing_email ?: $email,
                        'billing_phone' => $existingPaid->billing_phone ?: ($phone !== '' ? $phone : null),
                        'delivery_mode' => $existingPaid->delivery_mode ?: $mode,
                    ]);
                }
                $order = $existingPaid;
            } else {
                $order = Order::query()->create([
                    'user_id' => $user->id,
                    'course_id' => $course->id,
                    'stripe_payment_intent_id' => $intent->id,
                    'amount' => $amount,
                    'currency' => $currency,
                    'payment_status' => PaymentStatus::Paid,
                    'paid_at' => now(),
                    'billing_email' => $email,
                    'billing_first_name' => $firstName ?: $user->first_name,
                    'billing_last_name' => $lastName ?: $user->last_name,
                    'billing_phone' => $phone !== '' ? $phone : $user->phone_number,
                    'delivery_mode' => $mode,
                ]);
            }

            $this->progress->progressFor($user, $course);

            if ($isNewUser || $user->account_status === self::ACCOUNT_STATUS_PENDING_CLAIM) {
                if ($user->account_status !== self::ACCOUNT_STATUS_PENDING_CLAIM) {
                    $user->forceFill([
                        'account_status' => self::ACCOUNT_STATUS_PENDING_CLAIM,
                        'email_verified_at' => null,
                    ])->save();
                }

                try {
                    $courseTitle = (string) ($course->title ?: $course->title_en ?: 'your course');
                    $this->claimOtp->issue($user->refresh(), (string) $intent->id, $courseTitle);
                } catch (Throwable $e) {
                    Log::error('Failed to issue account claim OTP after payment.', [
                        'user_id' => $user->id,
                        'payment_intent_id' => $intent->id,
                        'message' => $e->getMessage(),
                    ]);
                }
            }

            return $order->refresh();
        });
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function splitName(string $name): array
    {
        $name = trim(preg_replace('/\s+/u', ' ', $name) ?? '');
        if ($name === '') {
            return ['Student', ''];
        }

        $parts = explode(' ', $name, 2);

        return [
            $parts[0],
            $parts[1] ?? '',
        ];
    }
}
