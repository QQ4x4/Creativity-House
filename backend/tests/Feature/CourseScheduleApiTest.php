<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseSchedule;
use App\Models\CourseScheduleException;
use App\Models\Order;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseScheduleApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo(CarbonImmutable::parse('2030-01-01 00:00:00', 'UTC'));

        $this->admin = User::factory()->create(['is_admin' => true, 'is_active' => true]);
    }

    /* ─── Admin CRUD ────────────────────────────────────────────────────── */

    public function test_admin_can_create_a_schedule(): void
    {
        $course = Course::factory()->create();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/courses/{$course->id}/schedules", $this->payload());

        $response->assertCreated()
            ->assertJsonPath('data.recurrence_type', 'weekly')
            ->assertJsonPath('data.repeat_interval', 2)
            ->assertJsonPath('data.start_time', '09:00');

        $this->assertDatabaseHas('course_schedules', [
            'course_id' => $course->id,
            'repeat_interval' => 2,
        ]);
    }

    public function test_a_guest_cannot_create_a_schedule(): void
    {
        $course = Course::factory()->create();

        $this->postJson("/api/v1/admin/courses/{$course->id}/schedules", $this->payload())
            ->assertUnauthorized();
    }

    public function test_a_non_admin_cannot_create_a_schedule(): void
    {
        $course = Course::factory()->create();
        $student = User::factory()->create(['is_admin' => false]);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/v1/admin/courses/{$course->id}/schedules", $this->payload())
            ->assertForbidden();
    }

    public function test_a_weekly_schedule_requires_weekdays(): void
    {
        $course = Course::factory()->create();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/courses/{$course->id}/schedules", $this->payload(['weekdays' => []]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('weekdays');
    }

    public function test_a_schedule_from_another_course_is_not_reachable(): void
    {
        $course = Course::factory()->create();
        $other = Course::factory()->create();
        $schedule = CourseSchedule::factory()->create(['course_id' => $other->id]);

        $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/courses/{$course->id}/schedules/{$schedule->id}")
            ->assertNotFound();
    }

    public function test_admin_can_update_and_delete_a_schedule(): void
    {
        $course = Course::factory()->create();
        $schedule = CourseSchedule::factory()->create(['course_id' => $course->id]);

        $this->actingAs($this->admin, 'sanctum')
            ->putJson(
                "/api/v1/admin/courses/{$course->id}/schedules/{$schedule->id}",
                $this->payload(['batch_number' => 12])
            )
            ->assertOk()
            ->assertJsonPath('data.batch_number', 12);

        $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/admin/courses/{$course->id}/schedules/{$schedule->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('course_schedules', ['id' => $schedule->id]);
    }

    public function test_duplicating_a_schedule_creates_an_inactive_copy(): void
    {
        $course = Course::factory()->create();
        $schedule = CourseSchedule::factory()->create([
            'course_id' => $course->id,
            'title_en' => 'Cohort A',
            'is_active' => true,
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/courses/{$course->id}/schedules/{$schedule->id}/duplicate")
            ->assertCreated()
            ->assertJsonPath('data.title_en', 'Cohort A (copy)')
            ->assertJsonPath('data.is_active', false);

        $this->assertSame(2, $course->schedules()->count());
    }

    public function test_preview_returns_dates_without_saving(): void
    {
        $course = Course::factory()->create();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/courses/{$course->id}/schedules/preview", $this->payload([
                'limit' => 3,
            ]));

        $response->assertOk()->assertJsonCount(3, 'data');

        // 2030-01-07 is a Monday; interval 2 skips every other week.
        $this->assertSame(
            ['2030-01-07', '2030-01-21', '2030-02-04'],
            array_column($response->json('data'), 'occurrence_date'),
        );

        $this->assertDatabaseCount('course_schedules', 0);
    }

    /* ─── Occurrence exceptions ─────────────────────────────────────────── */

    public function test_admin_can_cancel_a_single_occurrence(): void
    {
        $course = Course::factory()->create();
        $schedule = CourseSchedule::factory()->create([
            'course_id' => $course->id,
            'starts_on' => '2030-06-10',
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->putJson(
                "/api/v1/admin/courses/{$course->id}/schedules/{$schedule->id}/occurrences/2030-06-10",
                ['status' => 'cancelled']
            )
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');

        $this->assertDatabaseHas('course_schedule_exceptions', [
            'course_schedule_id' => $schedule->id,
            'status' => 'cancelled',
        ]);
    }

    public function test_an_occurrence_the_rule_does_not_generate_is_rejected(): void
    {
        $course = Course::factory()->create();
        $schedule = CourseSchedule::factory()->create([
            'course_id' => $course->id,
            'starts_on' => '2030-06-10',
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->putJson(
                "/api/v1/admin/courses/{$course->id}/schedules/{$schedule->id}/occurrences/2030-06-11",
                ['status' => 'cancelled']
            )
            ->assertStatus(422);
    }

    public function test_deleting_an_exception_restores_the_default(): void
    {
        $course = Course::factory()->create();
        $schedule = CourseSchedule::factory()->create([
            'course_id' => $course->id,
            'starts_on' => '2030-06-10',
        ]);

        CourseScheduleException::query()->create([
            'course_schedule_id' => $schedule->id,
            'occurrence_date' => '2030-06-10',
            'status' => 'cancelled',
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/admin/courses/{$course->id}/schedules/{$schedule->id}/occurrences/2030-06-10")
            ->assertNoContent();

        $this->assertDatabaseCount('course_schedule_exceptions', 0);
    }

    /* ─── Public surface ────────────────────────────────────────────────── */

    public function test_course_detail_includes_generated_schedules(): void
    {
        $course = Course::factory()->create();
        CourseSchedule::factory()->create([
            'course_id' => $course->id,
            'starts_on' => '2030-06-10',
            'seats_total' => 12,
            'show_seats_left' => true,
        ]);

        $this->getJson("/api/courses/{$course->slug}")
            ->assertOk()
            ->assertJsonCount(1, 'data.schedules')
            ->assertJsonPath('data.schedules.0.occurrence_date', '2030-06-10')
            ->assertJsonPath('data.schedules.0.seats_left', 12)
            ->assertJsonPath('data.schedules.0.is_bookable', true);
    }

    public function test_the_catalog_listing_payload_has_no_schedules_key(): void
    {
        $course = Course::factory()->create();
        CourseSchedule::factory()->create(['course_id' => $course->id, 'starts_on' => '2030-06-10']);

        $this->getJson('/api/courses')
            ->assertOk()
            ->assertJsonMissingPath('data.0.schedules');
    }

    public function test_inactive_schedules_are_not_exposed_publicly(): void
    {
        $course = Course::factory()->create();
        CourseSchedule::factory()->create([
            'course_id' => $course->id,
            'starts_on' => '2030-06-10',
            'is_active' => false,
        ]);

        $this->getJson("/api/courses/{$course->slug}")
            ->assertOk()
            ->assertJsonCount(0, 'data.schedules');
    }

    public function test_public_occurrence_lookup_rejects_a_foreign_schedule(): void
    {
        $course = Course::factory()->create();
        $other = Course::factory()->create();
        $schedule = CourseSchedule::factory()->create([
            'course_id' => $other->id,
            'starts_on' => '2030-06-10',
        ]);

        $this->getJson("/api/courses/{$course->id}/schedules/{$schedule->id}/occurrences/2030-06-10")
            ->assertNotFound();

        $this->getJson("/api/courses/{$other->id}/schedules/{$schedule->id}/occurrences/2030-06-10")
            ->assertOk()
            ->assertJsonPath('data.occurrence_date', '2030-06-10');
    }

    /* ─── Checkout ──────────────────────────────────────────────────────── */

    public function test_checkout_rejects_a_date_the_schedule_does_not_generate(): void
    {
        $course = Course::factory()->create();
        $schedule = CourseSchedule::factory()->create([
            'course_id' => $course->id,
            'starts_on' => '2030-06-10',
        ]);

        $this->postJson('/api/v1/checkout/create-payment-intent', [
            'course_id' => $course->id,
            'email' => 'buyer@example.com',
            'name' => 'Test Buyer',
            'phone' => '+60123456789',
            'schedule_id' => $schedule->id,
            'occurrence_date' => '2030-06-11',
        ])->assertStatus(422)->assertJsonPath('schedule_unavailable', true);
    }

    public function test_checkout_rejects_a_sold_out_batch(): void
    {
        $course = Course::factory()->create();
        $schedule = CourseSchedule::factory()->create([
            'course_id' => $course->id,
            'starts_on' => '2030-06-10',
            'seats_total' => 1,
        ]);

        Order::factory()->create([
            'user_id' => User::factory(),
            'course_id' => $course->id,
            'course_schedule_id' => $schedule->id,
            'schedule_occurrence_date' => '2030-06-10',
        ]);

        $this->postJson('/api/v1/checkout/create-payment-intent', [
            'course_id' => $course->id,
            'email' => 'buyer@example.com',
            'name' => 'Test Buyer',
            'phone' => '+60123456789',
            'schedule_id' => $schedule->id,
            'occurrence_date' => '2030-06-10',
        ])->assertStatus(422)->assertJsonPath('schedule_unavailable', true);
    }

    public function test_occurrence_date_requires_a_schedule_id(): void
    {
        $course = Course::factory()->create();

        $this->postJson('/api/v1/checkout/create-payment-intent', [
            'course_id' => $course->id,
            'email' => 'buyer@example.com',
            'name' => 'Test Buyer',
            'phone' => '+60123456789',
            'occurrence_date' => '2030-06-10',
        ])->assertStatus(422)->assertJsonValidationErrors('schedule_id');
    }

    /* ─── Past-date validation ──────────────────────────────────────────── */

    public function test_create_rejects_a_past_starts_on(): void
    {
        $course = Course::factory()->create();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/courses/{$course->id}/schedules", $this->payload([
                'starts_on' => '2029-12-31',
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('starts_on');
    }

    public function test_update_allows_unchanged_past_starts_on(): void
    {
        $course = Course::factory()->create();
        $schedule = CourseSchedule::factory()->create([
            'course_id' => $course->id,
            'starts_on' => '2029-06-10',
            'timezone' => 'Asia/Kuala_Lumpur',
            'start_time' => '09:00:00',
            'end_time' => '17:00:00',
            'recurrence_type' => 'once',
            'ends_type' => 'after_count',
            'max_occurrences' => 1,
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->putJson(
                "/api/v1/admin/courses/{$course->id}/schedules/{$schedule->id}",
                $this->payload([
                    'recurrence_type' => 'once',
                    'starts_on' => '2029-06-10',
                    'weekdays' => [],
                    'repeat_interval' => 1,
                    'ends_type' => 'never',
                    'batch_number' => 7,
                ])
            )
            ->assertOk()
            ->assertJsonPath('data.starts_on', '2029-06-10')
            ->assertJsonPath('data.batch_number', 7);
    }

    public function test_create_rejects_a_past_custom_date(): void
    {
        $course = Course::factory()->create();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/courses/{$course->id}/schedules", $this->payload([
                'recurrence_type' => 'custom_dates',
                'starts_on' => '2030-01-07',
                'custom_dates' => ['2029-12-20', '2030-01-07'],
                'weekdays' => [],
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('custom_dates.0');
    }

    public function test_create_rejects_today_when_start_time_has_passed(): void
    {
        $course = Course::factory()->create();

        // travelTo is 2030-01-01 00:00 UTC; in Asia/Kuala_Lumpur that is already
        // 08:00 on 2030-01-01, so a 07:00 start has passed.
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/courses/{$course->id}/schedules", $this->payload([
                'recurrence_type' => 'once',
                'starts_on' => '2030-01-01',
                'start_time' => '07:00',
                'end_time' => '17:00',
                'weekdays' => [],
                'ends_type' => 'never',
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('start_time');
    }

    public function test_update_allows_unchanged_start_time_that_has_already_passed(): void
    {
        $course = Course::factory()->create();
        $schedule = CourseSchedule::factory()->create([
            'course_id' => $course->id,
            'timezone' => 'Asia/Kuala_Lumpur',
            'starts_on' => '2030-01-01',
            'start_time' => '07:00:00',
            'end_time' => '17:00:00',
            'recurrence_type' => 'once',
            'ends_type' => 'after_count',
            'max_occurrences' => 1,
            'is_featured' => false,
        ]);

        // Same start date/time that already passed — saving other fields must work.
        $this->actingAs($this->admin, 'sanctum')
            ->putJson(
                "/api/v1/admin/courses/{$course->id}/schedules/{$schedule->id}",
                $this->payload([
                    'recurrence_type' => 'once',
                    'starts_on' => '2030-01-01',
                    'start_time' => '07:00',
                    'end_time' => '17:00',
                    'weekdays' => [],
                    'ends_type' => 'never',
                    'is_featured' => true,
                    'trainer_name_en' => 'Ada',
                ])
            )
            ->assertOk()
            ->assertJsonPath('data.is_featured', true)
            ->assertJsonPath('data.trainer_name_en', 'Ada');
    }

    public function test_create_rejects_ends_on_before_starts_on(): void
    {
        $course = Course::factory()->create();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/courses/{$course->id}/schedules", $this->payload([
                'starts_on' => '2030-03-01',
                'ends_type' => 'on_date',
                'ends_on' => '2030-02-01',
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('ends_on');
    }

    /* ─── Round-trip (every field) ──────────────────────────────────────── */

    public function test_schedule_round_trip_preserves_every_field_for_each_recurrence_type(): void
    {
        $course = Course::factory()->create();

        foreach ($this->fullPayloadsByRecurrence() as $type => $payload) {
            $create = $this->actingAs($this->admin, 'sanctum')
                ->postJson("/api/v1/admin/courses/{$course->id}/schedules", $payload)
                ->assertCreated();

            $id = (int) $create->json('data.id');
            $expected = $this->expectedRoundTrip($payload);

            $get = $this->actingAs($this->admin, 'sanctum')
                ->getJson("/api/v1/admin/courses/{$course->id}/schedules/{$id}")
                ->assertOk();

            foreach ($expected as $key => $value) {
                // assertEquals: JSON may decode whole-number floats as ints (299 vs 299.0).
                $this->assertEquals(
                    $value,
                    $get->json("data.{$key}"),
                    "GET round-trip mismatch for [{$type}].{$key}"
                );
            }

            // Trainer photo storage path must come back as a full public URL.
            $this->assertIsString($get->json('data.trainer_photo'));
            $this->assertMatchesRegularExpression(
                '#^https?://#',
                (string) $get->json('data.trainer_photo'),
                "trainer_photo must be an absolute URL for [{$type}]"
            );
        }
    }

    public function test_schedule_update_round_trip_changes_every_field(): void
    {
        $course = Course::factory()->create();

        $created = $this->actingAs($this->admin, 'sanctum')
            ->postJson(
                "/api/v1/admin/courses/{$course->id}/schedules",
                $this->fullPayloadsByRecurrence()['weekly']
            )
            ->assertCreated();

        $id = (int) $created->json('data.id');
        $updatedPayload = $this->fullPayloadsByRecurrence()['monthly_days'];
        $updatedPayload['title_en'] = 'Updated monthly title';
        $updatedPayload['start_time'] = '14:15';
        $updatedPayload['end_time'] = '18:45';
        $updatedPayload['is_featured'] = false;
        $updatedPayload['show_countdown'] = true;
        $updatedPayload['trainer_photo'] = 'uploads/updated-trainer.png';

        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/admin/courses/{$course->id}/schedules/{$id}", $updatedPayload)
            ->assertOk();

        $get = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/courses/{$course->id}/schedules/{$id}")
            ->assertOk();

        foreach ($this->expectedRoundTrip($updatedPayload) as $key => $value) {
            $this->assertEquals(
                $value,
                $get->json("data.{$key}"),
                "UPDATE round-trip mismatch for {$key}"
            );
        }
    }

    public function test_occurrence_override_round_trip_preserves_every_field(): void
    {
        $course = Course::factory()->create();
        $schedule = CourseSchedule::factory()->create([
            'course_id' => $course->id,
            'starts_on' => '2030-06-10',
            'start_time' => '09:00:00',
            'end_time' => '17:00:00',
        ]);

        $payload = [
            'status' => 'modified',
            'start_time' => '10:30',
            'end_time' => '16:00',
            'duration_days' => 2,
            'price' => 250.5,
            'original_price' => 300,
            'seats_total' => 8,
            'batch_number' => 42,
            'trainer_name_en' => 'Override Trainer',
            'trainer_name_ar' => 'مدرب',
            'trainer_photo' => 'uploads/override.jpg',
            'note_en' => 'Room change',
            'note_ar' => 'تغيير القاعة',
        ];

        $this->actingAs($this->admin, 'sanctum')
            ->putJson(
                "/api/v1/admin/courses/{$course->id}/schedules/{$schedule->id}/occurrences/2030-06-10",
                $payload
            )
            ->assertOk()
            ->assertJsonPath('data.occurrence_date', '2030-06-10')
            ->assertJsonPath('data.start_time', '10:30')
            ->assertJsonPath('data.end_time', '16:00')
            ->assertJsonPath('data.duration_days', 2)
            ->assertJsonPath('data.price', 250.5)
            ->assertJsonPath('data.original_price', 300)
            ->assertJsonPath('data.seats_total', 8)
            ->assertJsonPath('data.batch_number', 42)
            ->assertJsonPath('data.trainer_name_en', 'Override Trainer')
            ->assertJsonPath('data.trainer_name_ar', 'مدرب')
            ->assertJsonPath('data.note_en', 'Room change')
            ->assertJsonPath('data.note_ar', 'تغيير القاعة');

        $photo = $this->actingAs($this->admin, 'sanctum')
            ->putJson(
                "/api/v1/admin/courses/{$course->id}/schedules/{$schedule->id}/occurrences/2030-06-10",
                $payload
            )
            ->json('data.trainer_photo');

        $this->assertIsString($photo);
        $this->assertMatchesRegularExpression('#^https?://#', $photo);
    }

    /**
     * A valid weekly rule body, matching what the admin editor submits.
     *
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'format' => 'online',
            'timezone' => 'Asia/Kuala_Lumpur',
            'start_time' => '09:00',
            'end_time' => '17:00',
            'duration_days' => 1,
            'recurrence_type' => 'weekly',
            'starts_on' => '2030-01-07',
            'weekdays' => [1],
            'repeat_interval' => 2,
            'ends_type' => 'never',
            'cta_type' => 'enroll',
            'is_active' => true,
        ], $overrides);
    }

    /**
     * Full bodies for every recurrence type — every editable column filled.
     *
     * @return array<string, array<string, mixed>>
     */
    private function fullPayloadsByRecurrence(): array
    {
        $shared = [
            'delivery_mode' => 'live',
            'title_en' => 'Full batch EN',
            'title_ar' => 'دفعة كاملة',
            'batch_number' => 12,
            'time_slot' => 'morning',
            'format' => 'hybrid',
            'location_en' => 'Kuala Lumpur',
            'location_ar' => 'كوالالمبور',
            'timezone' => 'Asia/Kuala_Lumpur',
            'start_time' => '09:30',
            'end_time' => '17:45',
            'duration_days' => 2,
            'price' => 199.5,
            'original_price' => 299,
            'promo_text_en' => 'Early bird',
            'promo_text_ar' => 'حجز مبكر',
            'seats_total' => 20,
            'show_seats_left' => true,
            'enrollment_closes_hours' => 12,
            'cta_type' => 'inquiry',
            'trainer_name_en' => 'Ada Lovelace',
            'trainer_name_ar' => 'آدا',
            'trainer_title_en' => 'Lead instructor',
            'trainer_title_ar' => 'مدربة رئيسية',
            'trainer_photo' => 'uploads/trainer-ada.jpg',
            'show_countdown' => false,
            'is_featured' => true,
            'is_active' => true,
            'notes_en' => 'Bring a laptop',
            'notes_ar' => 'أحضر حاسوبك',
            'sort_order' => 3,
            'repeat_interval' => 1,
            'missing_day_policy' => 'skip',
            'custom_dates' => [],
            'weekdays' => [],
            'month_days' => [],
            'repeat_custom_monthly' => false,
            'ends_on' => null,
            'max_occurrences' => null,
        ];

        return [
            'once' => array_merge($shared, [
                'recurrence_type' => 'once',
                'starts_on' => '2030-03-05',
                'ends_type' => 'never',
            ]),
            'custom_dates' => array_merge($shared, [
                'recurrence_type' => 'custom_dates',
                'starts_on' => '2030-04-01',
                'custom_dates' => ['2030-04-01', '2030-04-15', '2030-05-01'],
                'repeat_custom_monthly' => true,
                'ends_type' => 'never',
            ]),
            'weekly' => array_merge($shared, [
                'recurrence_type' => 'weekly',
                'starts_on' => '2030-01-07',
                'weekdays' => [1, 3, 5],
                'repeat_interval' => 2,
                'ends_type' => 'on_date',
                'ends_on' => '2030-06-30',
            ]),
            'monthly_days' => array_merge($shared, [
                'recurrence_type' => 'monthly_days',
                'starts_on' => '2030-02-01',
                'month_days' => [1, 15, 31],
                'repeat_interval' => 2,
                'missing_day_policy' => 'last_day',
                'ends_type' => 'after_count',
                'max_occurrences' => 6,
            ]),
        ];
    }

    /**
     * What AdminCourseScheduleResource must return after save (normalized).
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function expectedRoundTrip(array $payload): array
    {
        $type = $payload['recurrence_type'];

        $expected = [
            'delivery_mode' => $payload['delivery_mode'],
            'title_en' => $payload['title_en'],
            'title_ar' => $payload['title_ar'],
            'batch_number' => (int) $payload['batch_number'],
            'time_slot' => $payload['time_slot'],
            'format' => $payload['format'],
            'location_en' => $payload['location_en'],
            'location_ar' => $payload['location_ar'],
            'timezone' => $payload['timezone'],
            'start_time' => $payload['start_time'],
            'end_time' => $payload['end_time'],
            'duration_days' => $payload['duration_days'],
            'recurrence_type' => $type,
            'starts_on' => $payload['starts_on'],
            'custom_dates' => $type === 'custom_dates' ? array_values($payload['custom_dates']) : [],
            'repeat_custom_monthly' => $type === 'custom_dates' && (bool) $payload['repeat_custom_monthly'],
            'weekdays' => $type === 'weekly' ? array_values(array_map('intval', $payload['weekdays'])) : [],
            'repeat_interval' => in_array($type, ['weekly', 'monthly_days'], true)
                ? (int) $payload['repeat_interval']
                : 1,
            'month_days' => $type === 'monthly_days' ? array_values(array_map('intval', $payload['month_days'])) : [],
            'missing_day_policy' => $payload['missing_day_policy'] ?? 'skip',
            'price' => (float) $payload['price'],
            'original_price' => (float) $payload['original_price'],
            'promo_text_en' => $payload['promo_text_en'],
            'promo_text_ar' => $payload['promo_text_ar'],
            'seats_total' => (int) $payload['seats_total'],
            'show_seats_left' => (bool) $payload['show_seats_left'],
            'enrollment_closes_hours' => (int) $payload['enrollment_closes_hours'],
            'cta_type' => $payload['cta_type'],
            'trainer_name_en' => $payload['trainer_name_en'],
            'trainer_name_ar' => $payload['trainer_name_ar'],
            'trainer_title_en' => $payload['trainer_title_en'],
            'trainer_title_ar' => $payload['trainer_title_ar'],
            'show_countdown' => (bool) $payload['show_countdown'],
            'is_featured' => (bool) $payload['is_featured'],
            'is_active' => (bool) $payload['is_active'],
            'notes_en' => $payload['notes_en'],
            'notes_ar' => $payload['notes_ar'],
            'sort_order' => (int) $payload['sort_order'],
        ];

        if ($type === 'once') {
            $expected['ends_type'] = 'after_count';
            $expected['ends_on'] = null;
            $expected['max_occurrences'] = 1;
        } else {
            $expected['ends_type'] = $payload['ends_type'];
            $expected['ends_on'] = ($payload['ends_type'] ?? null) === 'on_date'
                ? $payload['ends_on']
                : null;
            $expected['max_occurrences'] = ($payload['ends_type'] ?? null) === 'after_count'
                ? (int) $payload['max_occurrences']
                : null;
        }

        return $expected;
    }
}
