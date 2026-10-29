<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Stripe\HttpClient\ClientInterface as StripeHttpClient;
use Stripe\ApiRequestor;
use Tests\TestCase;

class PaymentControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /**
     * @return array<string, mixed>
     */
    private function checkoutPayload(Course $course, array $overrides = []): array
    {
        return array_merge([
            'course_id' => $course->id,
            'email' => 'buyer@example.com',
            'name' => 'Test Buyer',
            'phone' => '+60123456789',
        ], $overrides);
    }

    public function test_create_payment_intent_returns_409_when_current_user_already_owns_course(): void
    {
        $user = User::factory()->create(['email' => 'owner@example.com']);
        $course = Course::factory()->create(['price' => 1200]);
        Order::factory()->create([
            'user_id' => $user->id,
            'course_id' => $course->id,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/checkout/create-payment-intent', $this->checkoutPayload($course, [
                'email' => $user->email,
            ]))
            ->assertStatus(409)
            ->assertJsonPath('already_enrolled', true)
            ->assertJsonPath('reason', 'current_user')
            ->assertJsonPath('data.course_id', $course->id);
    }

    public function test_create_payment_intent_returns_409_when_typed_email_owner_already_owns_course(): void
    {
        $owner = User::factory()->create(['email' => 'owner@example.com']);
        $course = Course::factory()->create(['price' => 1200]);
        Order::factory()->create([
            'user_id' => $owner->id,
            'course_id' => $course->id,
        ]);

        $this->postJson('/api/v1/checkout/create-payment-intent', $this->checkoutPayload($course, [
            'email' => $owner->email,
        ]))
            ->assertStatus(409)
            ->assertJsonPath('already_enrolled', true)
            ->assertJsonPath('reason', 'email_owner')
            ->assertJsonMissingPath('data.course_id');
    }

    public function test_create_payment_intent_creates_stripe_intent_for_normal_purchase(): void
    {
        config(['services.stripe.secret' => 'sk_test_checkout_unit']);

        $course = Course::factory()->create(['price' => 1200]);
        $intentId = 'pi_test_checkout_123';
        $clientSecret = 'pi_test_checkout_123_secret_abc';

        $httpClient = Mockery::mock(StripeHttpClient::class);
        $httpClient->shouldReceive('request')
            ->once()
            ->andReturn([
                json_encode([
                    'id' => $intentId,
                    'object' => 'payment_intent',
                    'amount' => 120000,
                    'currency' => 'usd',
                    'client_secret' => $clientSecret,
                    'status' => 'requires_payment_method',
                ]),
                200,
                [],
            ]);

        ApiRequestor::setHttpClient($httpClient);

        try {
            $this->postJson(
                '/api/v1/checkout/create-payment-intent',
                $this->checkoutPayload($course)
            )
                ->assertOk()
                ->assertJsonPath('success', true)
                ->assertJsonPath('clientSecret', $clientSecret)
                ->assertJsonPath('data.payment_intent_id', $intentId)
                ->assertJsonPath('data.amount', 120000);
        } finally {
            ApiRequestor::setHttpClient(null);
        }
    }
}
