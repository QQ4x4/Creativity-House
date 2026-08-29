<?php

namespace App\Services\Checkout;

use App\Enums\PaymentStatus;
use App\Models\Course;
use App\Models\Order;
use App\Models\User;
use App\Services\Student\ProgressService;
use Illuminate\Support\Facades\DB;
use Stripe\Checkout\Session as StripeSession;

class StripeEnrollmentService
{
    public function __construct(private readonly ProgressService $progress) {}

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
}
