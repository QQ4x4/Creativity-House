<?php

namespace App\Services\Student;

use App\Enums\PaymentStatus;
use App\Models\Course;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * The one place that answers "may this student access this course?".
 *
 * Access is derived from a paid order — there is no separate enrollments table to
 * fall out of sync. Future modules (e.g. Exam Simulator) should call this rather
 * than re-querying orders.
 */
class EnrollmentService
{
    /**
     * Per-request memo: a single course page checks enrollment from the request,
     * the controller, and the service without repeating the query.
     *
     * @var array<string, bool>
     */
    private array $cache = [];

    public function isEnrolled(int $userId, int $courseId): bool
    {
        $key = $userId.':'.$courseId;

        return $this->cache[$key] ??= Order::query()
            ->where('user_id', $userId)
            ->where('course_id', $courseId)
            ->where('payment_status', PaymentStatus::Paid->value)
            ->exists();
    }

    /**
     * @throws AccessDeniedHttpException
     */
    public function assertEnrolled(User $user, Course $course): void
    {
        if (! $this->isEnrolled($user->id, $course->id)) {
            throw new AccessDeniedHttpException('You do not have access to this course.');
        }
    }

    /**
     * When the student first gained access (earliest paid order).
     */
    public function enrolledAt(int $userId, int $courseId): ?Carbon
    {
        /** @var Order|null $order */
        $order = Order::query()
            ->where('user_id', $userId)
            ->where('course_id', $courseId)
            ->where('payment_status', PaymentStatus::Paid->value)
            ->orderBy('paid_at')
            ->orderBy('created_at')
            ->first();

        if ($order === null) {
            return null;
        }

        return $order->paid_at ?? $order->created_at;
    }

    /**
     * Enrollment dates for many courses at once — avoids an N+1 in the
     * "my courses" listing.
     *
     * @param  list<int>  $courseIds
     * @return array<int, Carbon>
     */
    public function enrollmentDates(int $userId, array $courseIds): array
    {
        if ($courseIds === []) {
            return [];
        }

        return Order::query()
            ->where('user_id', $userId)
            ->whereIn('course_id', $courseIds)
            ->where('payment_status', PaymentStatus::Paid->value)
            ->orderBy('paid_at')
            ->orderBy('created_at')
            ->get(['course_id', 'paid_at', 'created_at'])
            ->reduce(function (array $carry, Order $order): array {
                // First row per course wins (query is ordered oldest-first).
                $carry[$order->course_id] ??= $order->paid_at ?? $order->created_at;

                return $carry;
            }, []);
    }
}
