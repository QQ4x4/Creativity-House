<?php

namespace App\Console\Commands;

use App\Enums\PaymentStatus;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Order;
use App\Models\User;
use App\Services\Student\ProgressService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Local helper: enroll DR-Talaat into the watchable PMP / PM Foundations course.
 *
 * Enrollment = a paid `orders` row (there is no separate enrollments table).
 *
 *   php artisan enroll:talaat
 */
class EnrollTalaatCommand extends Command
{
    private const BUNNY_VIDEO_ID = '4ae24953-6c34-4080-906e-b62ab1a8f6ab';

    private const LESSON_TITLE = 'Estimating time and cost realistically';

    private const DEFAULT_EMAIL = 'dr.talaat@creativity-house.com';

    protected $signature = 'enroll:talaat
                            {--email= : Override lookup / create email}
                            {--course=pm-foundations : Course slug (pm-foundations has lessons)}';

    protected $description = 'Enroll DR-Talaat into Project Management Foundations / PMP Live Training (paid order)';

    public function handle(ProgressService $progress): int
    {
        return DB::transaction(function () use ($progress): int {
            $user = $this->resolveUser();
            $course = $this->resolveCourse();

            if (! $course) {
                return self::FAILURE;
            }

            $this->ensureBunnyLesson($course);
            $order = $this->ensurePaidOrder($user, $course);
            $progress->progressFor($user, $course);

            $lessonCount = $course->lessons()->count();

            $this->info(sprintf(
                'Enrolled %s (user #%d, %s) in "%s" (course #%d, slug=%s).',
                $user->name ?: trim($user->first_name.' '.$user->last_name),
                $user->id,
                $user->email,
                $course->title,
                $course->id,
                $course->slug
            ));
            $this->line(sprintf(
                'Order #%d · reference=%s · status=%s · lessons=%d',
                $order->id,
                $order->reference,
                $order->payment_status->value,
                $lessonCount
            ));

            if ($lessonCount === 0) {
                $this->warn('This course has no lessons. Prefer --course=pm-foundations to watch Bunny Stream.');
            }

            return self::SUCCESS;
        });
    }

    private function resolveUser(): User
    {
        $emailOverride = filled($this->option('email'))
            ? (string) $this->option('email')
            : null;

        $query = User::query();

        if ($emailOverride) {
            $query->where('email', $emailOverride);
        } else {
            $query->where(function ($inner): void {
                $inner->where('name', 'like', '%DR-Talaat%')
                    ->orWhere('first_name', 'like', '%DR-Talaat%')
                    ->orWhere('name', 'like', '%Talaat%')
                    ->orWhere('email', 'like', '%talaat%')
                    ->orWhere('email', self::DEFAULT_EMAIL);
            });
        }

        $user = $query->orderBy('id')->first();

        if ($user) {
            $this->line("Found user #{$user->id} ({$user->email}).");

            return $user;
        }

        $email = $emailOverride ?: self::DEFAULT_EMAIL;

        $user = User::query()->create([
            'first_name' => 'DR-Talaat',
            'last_name' => 'Al-Awadhi',
            'name' => 'DR-Talaat Al-Awadhi',
            'email' => $email,
            'phone_number' => '+967700000000',
            'password' => 'Talaat@1234',
            'email_verified_at' => now(),
            'is_active' => true,
            'notification_preferences' => User::DEFAULT_NOTIFICATION_PREFERENCES,
        ]);

        $this->warn("Created user #{$user->id} ({$user->email}) with password Talaat@1234.");

        return $user;
    }

    private function resolveCourse(): ?Course
    {
        $slug = (string) $this->option('course');

        $course = Course::query()->where('slug', $slug)->first();

        if (! $course && $slug === 'pm-foundations') {
            $course = Course::query()
                ->where('slug', 'pmp-live-training')
                ->orWhere('title', 'like', '%Project Management Foundations%')
                ->orWhere('title', 'like', '%PMP%Live Training%')
                ->orderByRaw("CASE WHEN slug = 'pm-foundations' THEN 0 WHEN slug = 'pmp-live-training' THEN 1 ELSE 2 END")
                ->first();
        }

        if (! $course) {
            // Prefer the course that actually has curriculum (watchable).
            $course = Course::query()
                ->where(function ($inner): void {
                    $inner->where('slug', 'pm-foundations')
                        ->orWhere('slug', 'pmp-live-training')
                        ->orWhere('title', 'like', '%Project Management Foundations%')
                        ->orWhere('title', 'like', '%PMP%Live Training Full Program%');
                })
                ->withCount('lessons')
                ->orderByDesc('lessons_count')
                ->orderBy('id')
                ->first();
        }

        if (! $course) {
            $this->error('Could not find PMP Live Training / Project Management Foundations. Run StudentPortalSeeder first.');

            return null;
        }

        return $course;
    }

    private function ensurePaidOrder(User $user, Course $course): Order
    {
        $existing = Order::query()
            ->where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->where('payment_status', PaymentStatus::Paid->value)
            ->first();

        if ($existing) {
            if (! $existing->paid_at) {
                $existing->update(['paid_at' => now()]);
            }

            $this->line("Paid order already exists (#{$existing->id} / {$existing->reference}).");

            return $existing->refresh();
        }

        $order = Order::query()->create([
            'user_id' => $user->id,
            'course_id' => $course->id,
            'amount' => $course->price ?? 0,
            'currency' => $course->currency ?: 'USD',
            'payment_status' => PaymentStatus::Paid,
            'paid_at' => now(),
            'billing_email' => $user->email,
            'billing_first_name' => $user->first_name ?: 'DR-Talaat',
            'billing_last_name' => $user->last_name ?: 'Al-Awadhi',
            'billing_phone' => $user->phone_number,
            'delivery_mode' => $course->default_mode ?: 'recorded',
        ]);

        $this->line("Created paid order #{$order->id} ({$order->reference}).");

        return $order;
    }

    private function ensureBunnyLesson(Course $course): void
    {
        $lesson = Lesson::query()
            ->where('course_id', $course->id)
            ->where(function ($inner): void {
                $inner->where('id', 4)
                    ->orWhere('title', self::LESSON_TITLE);
            })
            ->orderByRaw('CASE WHEN id = 4 THEN 0 ELSE 1 END')
            ->first();

        if (! $lesson) {
            $this->warn('Lesson "Estimating time and cost realistically" not found on this course — Bunny ID not applied.');

            return;
        }

        if ($lesson->bunny_video_id !== self::BUNNY_VIDEO_ID) {
            $lesson->forceFill(['bunny_video_id' => self::BUNNY_VIDEO_ID])->save();
            $this->line("Set bunny_video_id on lesson #{$lesson->id}.");
        } else {
            $this->line("Lesson #{$lesson->id} already has the Bunny video ID.");
        }
    }
}
