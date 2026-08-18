<?php

namespace App\Services\Checkout;

use App\Enums\PaymentStatus;
use App\Models\Course;
use App\Models\Order;
use App\Models\User;
use App\Services\Student\ProgressService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CheckoutService
{
    public function __construct(private readonly ProgressService $progress) {}

    /**
     * Persist a mock (pre-Stripe) purchase: paid order + baseline progress.
     *
     * @param  array{
     *     first_name: string,
     *     last_name: string,
     *     email: string,
     *     phone_number: string,
     *     country: string,
     *     course_id?: int|null,
     *     course_slug?: string|null,
     *     mode?: string|null
     * }  $data
     * @return array{
     *     order: Order,
     *     course: Course,
     *     user: User,
     *     created_user: bool,
     *     already_enrolled: bool
     * }
     */
    public function process(array $data, ?User $authenticatedUser): array
    {
        $course = $this->resolveCourse($data);
        abort_unless($course->is_published && $course->is_public, 404);

        $mode = $this->resolveMode($course, $data['mode'] ?? null);
        $amount = $this->resolveAmount($course, $mode);

        return DB::transaction(function () use ($data, $authenticatedUser, $course, $mode, $amount): array {
            [$user, $createdUser] = $this->resolveUser($data, $authenticatedUser);

            $existing = Order::query()
                ->where('user_id', $user->id)
                ->where('course_id', $course->id)
                ->where('payment_status', PaymentStatus::Paid->value)
                ->latest('id')
                ->first();

            if ($existing) {
                $this->progress->progressFor($user, $course);

                return [
                    'order' => $existing,
                    'course' => $course,
                    'user' => $user,
                    'created_user' => $createdUser,
                    'already_enrolled' => true,
                ];
            }

            $order = Order::query()->create([
                'user_id' => $user->id,
                'course_id' => $course->id,
                'amount' => $amount,
                'currency' => $course->currency ?: 'USD',
                'payment_status' => PaymentStatus::Paid,
                'paid_at' => now(),
                'billing_first_name' => $data['first_name'],
                'billing_last_name' => $data['last_name'],
                'billing_email' => $data['email'],
                'billing_phone' => $data['phone_number'],
                'billing_country' => $data['country'],
                'delivery_mode' => $mode,
            ]);

            $this->progress->progressFor($user, $course);

            return [
                'order' => $order,
                'course' => $course,
                'user' => $user,
                'created_user' => $createdUser,
                'already_enrolled' => false,
            ];
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function resolveCourse(array $data): Course
    {
        $query = Course::query();

        if (! empty($data['course_id'])) {
            $course = $query->whereKey($data['course_id'])->first();
        } else {
            $course = $query->where('slug', $data['course_slug'] ?? '')->first();
        }

        if ($course === null) {
            throw new NotFoundHttpException('The selected course is not available.');
        }

        return $course;
    }

    private function resolveMode(Course $course, ?string $mode): string
    {
        $available = $course->available_modes;
        if (! is_array($available) || $available === []) {
            $catalog = is_array($course->catalog_modes) ? array_keys($course->catalog_modes) : [];
            $available = $catalog !== [] ? $catalog : array_filter([$course->default_mode]);
        }

        $candidate = $mode ?: ($course->default_mode ?: 'live');

        if (in_array($candidate, $available, true)) {
            return $candidate;
        }

        return $course->default_mode ?: (string) ($available[0] ?? 'live');
    }

    private function resolveAmount(Course $course, string $mode): float
    {
        $modes = $course->catalog_modes;

        if (is_array($modes) && isset($modes[$mode]) && is_array($modes[$mode])) {
            $price = $modes[$mode]['price'] ?? null;
            if (is_numeric($price)) {
                return round((float) $price, 2);
            }
        }

        return round((float) $course->price, 2);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{0: User, 1: bool}
     */
    private function resolveUser(array $data, ?User $authenticatedUser): array
    {
        if ($authenticatedUser) {
            return [$authenticatedUser, false];
        }

        $email = mb_strtolower((string) $data['email']);
        $existing = User::query()->where('email', $email)->first();

        if ($existing) {
            return [$existing, false];
        }

        $user = User::query()->create([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'name' => trim($data['first_name'].' '.$data['last_name']),
            'email' => $email,
            'phone_number' => $data['phone_number'],
            'password' => Str::password(32),
            'is_active' => true,
        ]);

        return [$user, true];
    }
}
