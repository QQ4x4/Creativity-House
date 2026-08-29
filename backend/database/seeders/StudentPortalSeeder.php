<?php

namespace Database\Seeders;

use App\Enums\PaymentStatus;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Order;
use App\Models\User;
use App\Services\Student\ProgressService;
use Illuminate\Database\Seeder;

/**
 * Mirrors the student portal demo curriculum so the portal shows real lesson
 * rows once NEXT_PUBLIC_API_URL points at Laravel.
 *
 * NOT wired into DatabaseSeeder — run it explicitly:
 *   php artisan db:seed --class=StudentPortalSeeder
 *
 * Idempotent: keyed on course slug and order reference, so re-running updates
 * rather than duplicating.
 */
class StudentPortalSeeder extends Seeder
{
    private const STUDENT_EMAIL = 'student@creativity-house.com';

    private const SAMPLE_VIDEOS = [
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    ];

    public function run(): void
    {
        $student = $this->student();

        foreach ($this->catalog() as $definition) {
            $course = $this->seedCourse($definition);
            $lessons = $this->seedLessons($course, $definition['lessons']);

            $this->seedOrder($student, $course, $definition);
            $this->seedProgress($student, $course, $lessons, $definition['completed_count']);
        }

        $this->command->info('Student portal demo data seeded for '.$student->email);

        $this->call(PublicCatalogSeeder::class);
    }

    private function student(): User
    {
        return User::updateOrCreate(
            ['email' => self::STUDENT_EMAIL],
            [
                'first_name' => 'Student',
                'last_name' => 'Account',
                'name' => 'Student Account',
                'phone_number' => '+967771234567',
                'password' => 'Student@1234',
                'email_verified_at' => now(),
                'is_active' => true,
                'notification_preferences' => User::DEFAULT_NOTIFICATION_PREFERENCES,
            ]
        );
    }

    /**
     * @param  array<string, mixed>  $definition
     */
    private function seedCourse(array $definition): Course
    {
        return Course::updateOrCreate(
            ['slug' => $definition['slug']],
            [
                'title' => $definition['title'],
                'description' => $definition['description'],
                'price' => $definition['price'],
                'currency' => 'USD',
                'cover_image' => $definition['cover_image'],
                'total_hours' => $definition['total_hours'],
                'instructor_name' => 'Dr. Ahmed Al-Sharafi',
                'level' => $definition['level'],
                'is_published' => true,
                'is_public' => false,
                'sort_order' => $definition['sort_order'],
                'seo_title' => $definition['title'].' | Creativity House',
                'seo_description' => $definition['description'],
                'seo_keywords' => $definition['seo_keywords'],
            ]
        );
    }

    /**
     * @param  list<array<string, mixed>>  $lessons
     * @return list<Lesson>
     */
    private function seedLessons(Course $course, array $lessons): array
    {
        $created = [];

        foreach ($lessons as $index => $lesson) {
            $created[] = Lesson::updateOrCreate(
                ['course_id' => $course->id, 'title' => $lesson['title']],
                [
                    'module_name' => $lesson['module'],
                    'video_url' => self::SAMPLE_VIDEOS[$index % count(self::SAMPLE_VIDEOS)],
                    'bunny_video_id' => $lesson['bunny_video_id'] ?? null,
                    'duration' => $lesson['duration'],
                    'pdf_resource_urls' => $lesson['resources'] ?? [],
                    'is_locked' => $lesson['locked'] ?? false,
                    'sort_order' => $index + 1,
                ]
            );
        }

        return $created;
    }

    /**
     * @param  array<string, mixed>  $definition
     */
    private function seedOrder(User $student, Course $course, array $definition): void
    {
        $status = PaymentStatus::from($definition['payment_status']);

        Order::updateOrCreate(
            ['reference' => $definition['order_reference']],
            [
                'user_id' => $student->id,
                'course_id' => $course->id,
                'amount' => $definition['price'],
                'currency' => 'USD',
                'payment_status' => $status,
                'paid_at' => $status->grantsAccess() ? $definition['purchased_at'] : null,
                'invoice_path' => null,
            ]
        );
    }

    /**
     * Progress is written through ProgressService so the percentage and learning
     * time come from the same code path the API uses.
     *
     * @param  list<Lesson>  $lessons
     */
    private function seedProgress(User $student, Course $course, array $lessons, int $completedCount): void
    {
        $progress = app(ProgressService::class);

        // Reset first so re-running the seeder is not additive.
        $progress->progressFor($student, $course)->forceFill([
            'completed_lessons' => [],
            'completion_percentage' => 0,
            'total_learning_seconds' => 0,
            'last_lesson_id' => null,
            'completed_at' => null,
        ])->save();

        foreach (array_slice($lessons, 0, $completedCount) as $lesson) {
            $progress->setLessonCompletion($student, $course, $lesson->id, true);
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function catalog(): array
    {
        return [
            [
                'slug' => 'pm-foundations',
                'title' => 'Project Management Foundations',
                'description' => 'Plan, execute, and close projects with confidence using industry-standard practices.',
                'price' => 149,
                'total_hours' => 12.5,
                'level' => 'Beginner',
                'sort_order' => 1,
                'seo_keywords' => ['project management', 'pmp', 'planning'],
                'cover_image' => 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=70',
                'order_reference' => 'CH-2026-0104',
                'payment_status' => 'paid',
                'purchased_at' => '2026-01-18 10:00:00',
                'completed_count' => 3,
                'lessons' => [
                    [
                        'module' => 'Module 1: Introduction',
                        'title' => 'Welcome & how this course works',
                        'duration' => 412,
                        'resources' => [
                            ['title' => 'Course roadmap.pdf', 'url' => '/files/course-roadmap.pdf', 'type' => 'pdf', 'size_bytes' => 284000],
                        ],
                    ],
                    ['module' => 'Module 1: Introduction', 'title' => 'What project managers actually do', 'duration' => 738],
                    [
                        'module' => 'Module 2: Planning & Scope',
                        'title' => 'Building a work breakdown structure',
                        'duration' => 1024,
                        'resources' => [
                            ['title' => 'WBS template.pdf', 'url' => '/files/wbs-template.pdf', 'type' => 'pdf', 'size_bytes' => 512000],
                            ['title' => 'Scope checklist.pdf', 'url' => '/files/scope-checklist.pdf', 'type' => 'pdf', 'size_bytes' => 196000],
                        ],
                    ],
                    [
                        'module' => 'Module 2: Planning & Scope',
                        'title' => 'Estimating time and cost realistically',
                        'duration' => 866,
                        'bunny_video_id' => '4ae24953-6c34-4080-906e-b62ab1a8f6ab',
                    ],
                    [
                        'module' => 'Module 3: Execution & Risk',
                        'title' => 'Running a risk register',
                        'duration' => 954,
                        'resources' => [
                            ['title' => 'Risk register.pdf', 'url' => '/files/risk-register.pdf', 'type' => 'pdf', 'size_bytes' => 340000],
                        ],
                    ],
                    [
                        'module' => 'Module 3: Execution & Risk',
                        'title' => 'Closing a project and capturing lessons',
                        'duration' => 621,
                        'locked' => true,
                    ],
                ],
            ],
            [
                'slug' => 'leadership-coaching',
                'title' => 'Leadership & Team Coaching',
                'description' => 'Shift from managing tasks to coaching people, with scripts for the hard conversations.',
                'price' => 199,
                'total_hours' => 9,
                'level' => 'Intermediate',
                'sort_order' => 2,
                'seo_keywords' => ['leadership', 'coaching', 'management'],
                'cover_image' => 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=70',
                'order_reference' => 'CH-2026-0087',
                'payment_status' => 'paid',
                'purchased_at' => '2025-11-04 10:00:00',
                'completed_count' => 4,
                'lessons' => [
                    [
                        'module' => 'Module 1: Coaching Mindset',
                        'title' => 'From manager to coach',
                        'duration' => 505,
                        'resources' => [
                            ['title' => 'Coaching questions.pdf', 'url' => '/files/coaching-questions.pdf', 'type' => 'pdf', 'size_bytes' => 220000],
                        ],
                    ],
                    ['module' => 'Module 1: Coaching Mindset', 'title' => 'Active listening in 1-on-1s', 'duration' => 690],
                    [
                        'module' => 'Module 2: Difficult Conversations',
                        'title' => 'Giving feedback that lands',
                        'duration' => 812,
                        'resources' => [
                            ['title' => 'Feedback script.pdf', 'url' => '/files/feedback-script.pdf', 'type' => 'pdf', 'size_bytes' => 168000],
                        ],
                    ],
                    ['module' => 'Module 2: Difficult Conversations', 'title' => 'Handling underperformance', 'duration' => 744],
                ],
            ],
            [
                'slug' => 'strategic-planning',
                'title' => 'Strategic Planning Masterclass',
                'description' => 'Translate a long-term vision into quarterly objectives your team can actually run.',
                'price' => 179,
                'total_hours' => 7.5,
                'level' => 'Advanced',
                'sort_order' => 3,
                'seo_keywords' => ['strategy', 'okr', 'planning'],
                'cover_image' => 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=70',
                // Refunded on purpose: proves the enrollment guard hides the course
                // from /my-courses while it still appears in purchase history.
                'order_reference' => 'CH-2025-0421',
                'payment_status' => 'refunded',
                'purchased_at' => '2025-08-22 10:00:00',
                'completed_count' => 0,
                'lessons' => [
                    ['module' => 'Module 1: Strategy Basics', 'title' => 'Vision, mission, and measurable goals', 'duration' => 578],
                    [
                        'module' => 'Module 1: Strategy Basics',
                        'title' => 'Reading the competitive landscape',
                        'duration' => 902,
                        'resources' => [
                            ['title' => 'SWOT worksheet.pdf', 'url' => '/files/swot-worksheet.pdf', 'type' => 'pdf', 'size_bytes' => 240000],
                        ],
                    ],
                    ['module' => 'Module 2: Execution', 'title' => 'Turning strategy into quarterly OKRs', 'duration' => 1105],
                ],
            ],
        ];
    }
}
