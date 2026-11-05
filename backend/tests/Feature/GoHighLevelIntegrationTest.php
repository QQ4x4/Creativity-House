<?php

namespace Tests\Feature;

use App\Enums\PaymentStatus;
use App\Jobs\ProcessGhlWebhook;
use App\Jobs\SyncGhlCheckoutStarted;
use App\Jobs\SyncGhlInquiry;
use App\Jobs\SyncGhlPaymentSucceeded;
use App\Jobs\SyncGhlRegistration;
use App\Models\Course;
use App\Models\GhlSyncLog;
use App\Models\Order;
use App\Models\User;
use App\Services\GoHighLevel\GoHighLevelClient;
use App\Services\GoHighLevel\GoHighLevelSyncService;
use App\Services\OtpService;
use App\Services\RecaptchaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class GoHighLevelIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function enableGhl(): void
    {
        config([
            'services.gohighlevel.enabled' => true,
            'services.gohighlevel.private_token' => 'pit-test-token',
            'services.gohighlevel.location_id' => 'loc_test',
            'services.gohighlevel.api_base' => 'https://services.leadconnectorhq.com',
            'services.gohighlevel.api_version' => '2021-07-28',
            'services.gohighlevel.pipeline_id' => 'pipe_1',
            'services.gohighlevel.stages.lead' => 'stage_lead',
            'services.gohighlevel.stages.inquiry' => 'stage_inquiry',
            'services.gohighlevel.stages.checkout' => 'stage_checkout',
            'services.gohighlevel.stages.won' => 'stage_won',
            'services.gohighlevel.webhook_secret' => 'whsec_test',
            'services.gohighlevel.inbound_enroll_enabled' => false,
            'services.gohighlevel.api_version' => '2021-07-28',
        ]);
    }

    public function test_contact_upsert_sends_bearer_and_version_headers(): void
    {
        $this->enableGhl();

        Http::fake([
            'services.leadconnectorhq.com/contacts/upsert' => Http::response([
                'contact' => ['id' => 'c_123'],
            ], 200),
        ]);

        $id = app(GoHighLevelClient::class)->upsertContact([
            'email' => 'buyer@example.com',
            'firstName' => 'Test',
            'source' => 'Website',
        ]);

        $this->assertSame('c_123', $id);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://services.leadconnectorhq.com/contacts/upsert'
                && $request->hasHeader('Authorization', 'Bearer pit-test-token')
                && $request->hasHeader('Version', '2021-07-28')
                && $request['email'] === 'buyer@example.com'
                && $request['locationId'] === 'loc_test';
        });
    }

    public function test_client_is_noop_when_disabled(): void
    {
        config([
            'services.gohighlevel.enabled' => false,
            'services.gohighlevel.private_token' => 'pit-test-token',
            'services.gohighlevel.location_id' => 'loc_test',
        ]);

        Http::fake();

        $id = app(GoHighLevelClient::class)->upsertContact([
            'email' => 'buyer@example.com',
        ]);

        $this->assertNull($id);
        Http::assertNothingSent();
    }

    public function test_custom_fields_resolve_from_legacy_endpoint_with_contact_prefix(): void
    {
        $this->enableGhl();
        app(GoHighLevelClient::class)->clearCustomFieldsCache();

        Http::fake([
            'services.leadconnectorhq.com/locations/*/customFields*' => Http::response([
                'customFields' => [
                    [
                        'id' => 'cf_legacy_1',
                        'name' => 'Website User Id',
                        'fieldKey' => 'contact.website_user_id',
                    ],
                    [
                        'id' => 'cf_legacy_2',
                        'name' => 'Google Click Id',
                        'fieldKey' => '{{ contact.google_click_id }}',
                    ],
                ],
            ], 200),
            'services.leadconnectorhq.com/custom-fields/object-key/contact*' => Http::response([
                'fields' => [],
            ], 200),
        ]);

        $ids = app(GoHighLevelClient::class)->getCustomFieldIds();

        $this->assertSame('cf_legacy_1', $ids['website_user_id']);
        $this->assertSame('cf_legacy_2', $ids['google_click_id']);
    }

    public function test_custom_fields_merge_object_key_endpoint_when_legacy_misses_keys(): void
    {
        $this->enableGhl();
        app(GoHighLevelClient::class)->clearCustomFieldsCache();

        Http::fake([
            'services.leadconnectorhq.com/locations/*/customFields*' => Http::response([
                'customFields' => [
                    [
                        'id' => 'cf_legacy_only',
                        'fieldKey' => 'contact.last_course',
                    ],
                ],
            ], 200),
            'services.leadconnectorhq.com/custom-fields/object-key/contact*' => Http::response([
                'customFields' => [
                    [
                        'id' => 'cf_object_1',
                        'fieldKey' => 'contact.preferred_language',
                        'name' => 'Preferred Language',
                    ],
                    [
                        'id' => 'cf_object_2',
                        'key' => 'fbclid',
                    ],
                ],
            ], 200),
        ]);

        $client = app(GoHighLevelClient::class);
        $ids = $client->getCustomFieldIds();

        $this->assertSame('cf_legacy_only', $ids['last_course']);
        $this->assertSame('cf_object_1', $ids['preferred_language']);
        $this->assertSame('cf_object_2', $ids['fbclid']);

        $listed = $client->listCustomFields();
        $this->assertCount(3, $listed);
        $this->assertTrue(collect($listed)->contains(
            fn (array $row) => $row['id'] === 'cf_object_1'
                && str_contains($row['endpoint'], '/custom-fields/object-key/contact')
        ));
    }

    public function test_normalize_field_key_strips_mustache_and_contact_prefix(): void
    {
        $client = app(GoHighLevelClient::class);

        $this->assertSame(
            'website_user_id',
            $client->normalizeFieldKey('{{ contact.website_user_id }}')
        );
        $this->assertSame(
            'google_click_id',
            $client->normalizeFieldKey('contact.google_click_id')
        );
        $this->assertSame(
            'fbclid',
            $client->normalizeFieldKey('FBCLID')
        );
    }

    public function test_ghl_diagnose_clears_custom_field_cache(): void
    {
        $this->enableGhl();
        $client = app(GoHighLevelClient::class);
        $cacheKey = $client->customFieldsCacheKey();

        // Poison the cache with an empty map so a successful diagnose fetch must clear it first.
        \Illuminate\Support\Facades\Cache::put($cacheKey, [], now()->addHour());

        Http::fake(function (\Illuminate\Http\Client\Request $request) {
            $url = $request->url();

            if (str_contains($url, '/customFields')) {
                return Http::response([
                    'customFields' => [
                        [
                            'id' => 'cf_print',
                            'name' => 'Website User Id',
                            'fieldKey' => 'contact.website_user_id',
                        ],
                    ],
                ], 200);
            }

            if (str_contains($url, '/custom-fields/object-key/contact')) {
                return Http::response(['customFields' => []], 200);
            }

            if (str_contains($url, '/opportunities/pipelines')) {
                return Http::response([
                    'pipelines' => [
                        [
                            'id' => 'pipe_1',
                            'name' => 'Sales',
                            'stages' => [
                                ['id' => 'stage_lead', 'name' => 'Lead'],
                                ['id' => 'stage_inquiry', 'name' => 'Inquiry'],
                                ['id' => 'stage_checkout', 'name' => 'Checkout'],
                                ['id' => 'stage_won', 'name' => 'Won'],
                            ],
                        ],
                    ],
                ], 200);
            }

            if (preg_match('#/locations/[^/]+$#', $url)) {
                return Http::response(['location' => ['name' => 'Test Loc']], 200);
            }

            return Http::response(['ok' => true], 200);
        });

        $this->artisan('ghl:diagnose', ['--list-fields' => true])
            ->expectsOutputToContain('cf_print')
            ->assertExitCode(1); // other website keys still MISSING in this fixture

        $ids = $client->getCustomFieldIds();
        $this->assertSame('cf_print', $ids['website_user_id'] ?? null);

        $listed = $client->listCustomFields();
        $this->assertTrue(collect($listed)->contains(
            fn (array $row) => $row['id'] === 'cf_print'
                && $row['fieldKey'] === 'contact.website_user_id'
                && $row['name'] === 'Website User Id'
        ));
    }

    public function test_register_dispatches_ghl_registration_job(): void
    {
        Bus::fake([SyncGhlRegistration::class]);
        Mail::fake();

        $this->mock(RecaptchaService::class, function ($mock) {
            $mock->shouldReceive('shouldEnforce')->andReturn(false);
            $mock->shouldReceive('verify')->andReturn(true);
        });
        $this->mock(OtpService::class, function ($mock) {
            $mock->shouldReceive('issue')->once();
        });

        $this->postJson('/api/auth/register', [
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'email' => 'ada@example.com',
            'phone_number' => '+60123456789',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
            'lang' => 'en',
        ])->assertCreated();

        Bus::assertDispatched(SyncGhlRegistration::class, function (SyncGhlRegistration $job) {
            return ($job->payload['lang'] ?? null) === 'en'
                && isset($job->payload['user_id']);
        });
    }

    public function test_inquiry_dispatches_ghl_job_with_course_inquiry_tags_context(): void
    {
        Bus::fake([SyncGhlInquiry::class]);
        $course = Course::factory()->create(['slug' => 'pmp-live', 'title' => 'PMP Live']);

        $this->postJson('/api/v1/inquiries', [
            'type' => 'user',
            'full_name' => 'Sam Student',
            'email' => 'sam@example.com',
            'phone_number' => '+60123456789',
            'message' => str_repeat('Need details about the course schedule. ', 2),
            'course_id' => $course->id,
            'lang' => 'en',
        ])->assertCreated();

        Bus::assertDispatched(SyncGhlInquiry::class, function (SyncGhlInquiry $job) use ($course) {
            return ($job->payload['type'] ?? null) === 'user'
                && ($job->payload['course_slug'] ?? null) === $course->slug
                && ($job->payload['email'] ?? null) === 'sam@example.com';
        });
    }

    public function test_organization_inquiry_dispatches_ghl_job(): void
    {
        Bus::fake([SyncGhlInquiry::class]);

        $this->postJson('/api/v1/inquiries', [
            'type' => 'organization',
            'full_name' => 'Corp Lead',
            'email' => 'corp@example.com',
            'phone_number' => '+60123456789',
            'company_name' => 'Acme Corp',
            'message' => str_repeat('We need corporate training for our team. ', 2),
            'lang' => 'en',
        ])->assertCreated();

        Bus::assertDispatched(SyncGhlInquiry::class, function (SyncGhlInquiry $job) {
            return ($job->payload['type'] ?? null) === 'organization'
                && ($job->payload['company_name'] ?? null) === 'Acme Corp';
        });
    }

    public function test_user_contact_us_inquiry_upserts_then_untags_then_tags_without_inbox(): void
    {
        $this->enableGhl();
        app(GoHighLevelClient::class)->clearCustomFieldsCache();

        $sequence = [];

        Http::fake(function (\Illuminate\Http\Client\Request $request) use (&$sequence) {
            $url = $request->url();
            $method = strtoupper($request->method());

            if (str_contains($url, '/customFields') || str_contains($url, '/custom-fields/')) {
                return Http::response([
                    'customFields' => [
                        ['id' => 'cf_target', 'fieldKey' => 'contact.target_course'],
                        ['id' => 'cf_message', 'fieldKey' => 'contact.contact_message'],
                        ['id' => 'cf_lang', 'fieldKey' => 'contact.preferred_language'],
                    ],
                ], 200);
            }
            if (str_contains($url, '/contacts/upsert')) {
                $sequence[] = 'upsert';

                return Http::response(['contact' => ['id' => 'c_inq']], 200);
            }
            if ($method === 'DELETE' && str_contains($url, '/tags')) {
                $sequence[] = 'tag_delete';

                return Http::response([], 200);
            }
            if ($method === 'POST' && str_contains($url, '/tags')) {
                $sequence[] = 'tag_add';

                return Http::response([], 200);
            }
            if (str_contains($url, '/notes')
                || str_contains($url, '/conversations')
                || str_contains($url, '/opportunities')) {
                $sequence[] = 'forbidden_'.$method.'_'.$url;

                return Http::response(['error' => 'should not be called'], 500);
            }

            return Http::response(['ok' => true], 200);
        });

        app(GoHighLevelSyncService::class)->syncInquiry([
            'inquiry_id' => 101,
            'type' => 'user',
            'email' => 'ask@example.com',
            'name' => 'Sam Student',
            'phone' => '+60123456789',
            'country' => 'MY',
            'course_title' => 'PMP Live',
            'course_slug' => 'pmp-live',
            'message' => 'When does the next cohort start?',
            'lang' => 'en',
        ]);

        $this->assertSame(['upsert', 'tag_delete', 'tag_add'], $sequence);

        Http::assertSent(function ($request) {
            if (! str_contains($request->url(), '/contacts/upsert')) {
                return false;
            }
            $custom = collect($request['customFields'] ?? []);

            return ($request['firstName'] ?? null) === 'Sam'
                && ($request['lastName'] ?? null) === 'Student'
                && ($request['name'] ?? null) === 'Sam Student'
                && ($request['email'] ?? null) === 'ask@example.com'
                && ($request['phone'] ?? null) === '+60123456789'
                && ($request['country'] ?? null) === 'MY'
                && ($request['source'] ?? null) === 'Website - Contact Us'
                && ! array_key_exists('tags', $request->data())
                && $custom->contains(fn ($row) => ($row['id'] ?? null) === 'cf_target'
                    && ($row['field_value'] ?? null) === 'PMP Live')
                && $custom->contains(fn ($row) => ($row['id'] ?? null) === 'cf_message'
                    && ($row['field_value'] ?? null) === 'When does the next cohort start?');
        });

        Http::assertSent(function ($request) {
            return strtoupper($request->method()) === 'DELETE'
                && str_contains($request->url(), '/contacts/c_inq/tags')
                && ($request['tags'] ?? null) === ['course-inquiry'];
        });

        Http::assertSent(function ($request) {
            return strtoupper($request->method()) === 'POST'
                && str_contains($request->url(), '/contacts/c_inq/tags')
                && ($request['tags'] ?? []) === ['course-inquiry', 'website-contact-us', 'course-pmp-live'];
        });

        Http::assertNotSent(fn ($request) => str_contains($request->url(), '/notes'));
        Http::assertNotSent(fn ($request) => str_contains($request->url(), '/conversations'));
        Http::assertNotSent(fn ($request) => str_contains($request->url(), '/opportunities'));

        $this->assertDatabaseHas('ghl_sync_logs', [
            'entity_id' => '101',
            'action' => 'inquiry_upsert',
            'status' => 'success',
        ]);
        $this->assertDatabaseHas('ghl_sync_logs', [
            'entity_id' => '101',
            'action' => 'inquiry_tag_remove',
            'status' => 'success',
        ]);
        $this->assertDatabaseHas('ghl_sync_logs', [
            'entity_id' => '101',
            'action' => 'inquiry_tag_add',
            'status' => 'success',
        ]);
        $this->assertDatabaseHas('ghl_sync_logs', [
            'entity_id' => '101',
            'action' => 'course_inquiry',
            'status' => 'success',
        ]);
    }

    public function test_user_inquiry_upsert_failure_skips_tags(): void
    {
        $this->enableGhl();
        app(GoHighLevelClient::class)->clearCustomFieldsCache();

        $tagCalled = false;

        Http::fake(function (\Illuminate\Http\Client\Request $request) use (&$tagCalled) {
            $url = $request->url();

            if (str_contains($url, '/customFields') || str_contains($url, '/custom-fields/')) {
                return Http::response(['customFields' => []], 200);
            }
            if (str_contains($url, '/contacts/upsert')) {
                return Http::response(['message' => 'upsert failed'], 500);
            }
            if (str_contains($url, '/tags')) {
                $tagCalled = true;

                return Http::response([], 200);
            }

            return Http::response(['ok' => true], 200);
        });

        app(GoHighLevelSyncService::class)->syncInquiry([
            'inquiry_id' => 777,
            'type' => 'user',
            'email' => 'fail@example.com',
            'name' => 'Fail User',
            'phone' => '+60123456789',
            'message' => 'This upsert should fail before tags.',
            'lang' => 'en',
        ]);

        $this->assertFalse($tagCalled);
        $this->assertDatabaseHas('ghl_sync_logs', [
            'entity_id' => '777',
            'action' => 'inquiry_upsert',
            'status' => 'failed',
            'http_status' => 500,
        ]);
        $this->assertDatabaseMissing('ghl_sync_logs', [
            'entity_id' => '777',
            'action' => 'course_inquiry',
            'status' => 'success',
        ]);
    }

    public function test_user_inquiry_tag_remove_failure_still_adds_tags(): void
    {
        $this->enableGhl();
        app(GoHighLevelClient::class)->clearCustomFieldsCache();

        $tagAddCalled = false;

        Http::fake(function (\Illuminate\Http\Client\Request $request) use (&$tagAddCalled) {
            $url = $request->url();
            $method = strtoupper($request->method());

            if (str_contains($url, '/customFields') || str_contains($url, '/custom-fields/')) {
                return Http::response(['customFields' => []], 200);
            }
            if (str_contains($url, '/contacts/upsert')) {
                return Http::response(['contact' => ['id' => 'c_tag']], 200);
            }
            if ($method === 'DELETE' && str_contains($url, '/tags')) {
                return Http::response(['message' => 'delete failed'], 500);
            }
            if ($method === 'POST' && str_contains($url, '/tags')) {
                $tagAddCalled = true;

                return Http::response([], 200);
            }

            return Http::response(['ok' => true], 200);
        });

        app(GoHighLevelSyncService::class)->syncInquiry([
            'inquiry_id' => 778,
            'type' => 'user',
            'email' => 'retag@example.com',
            'name' => 'Retag User',
            'phone' => '+60123456789',
            'course_slug' => 'pmp-live',
            'course_title' => 'PMP Live',
            'message' => 'Tag delete failure should not block tag add.',
            'lang' => 'en',
        ]);

        $this->assertTrue($tagAddCalled);
        $this->assertDatabaseHas('ghl_sync_logs', [
            'entity_id' => '778',
            'action' => 'inquiry_tag_remove',
            'status' => 'failed',
            'http_status' => 500,
        ]);
        $this->assertDatabaseHas('ghl_sync_logs', [
            'entity_id' => '778',
            'action' => 'inquiry_tag_add',
            'status' => 'success',
        ]);
    }

    public function test_user_inquiry_requires_phone(): void
    {
        Bus::fake([SyncGhlInquiry::class]);

        $this->postJson('/api/v1/inquiries', [
            'type' => 'user',
            'full_name' => 'No Phone',
            'email' => 'nophone@example.com',
            'message' => str_repeat('Need details about the course schedule. ', 2),
            'lang' => 'en',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['phone_number']);

        Bus::assertNotDispatched(SyncGhlInquiry::class);
    }

    public function test_organization_inquiry_upserts_then_untags_then_tags_without_inbox(): void
    {
        $this->enableGhl();
        app(GoHighLevelClient::class)->clearCustomFieldsCache();

        $sequence = [];

        Http::fake(function (\Illuminate\Http\Client\Request $request) use (&$sequence) {
            $url = $request->url();
            $method = strtoupper($request->method());

            if (str_contains($url, '/customFields') || str_contains($url, '/custom-fields/')) {
                return Http::response([
                    'customFields' => [
                        ['id' => 'cf_target', 'fieldKey' => 'contact.target_course'],
                        ['id' => 'cf_message', 'fieldKey' => 'contact.contact_message'],
                        ['id' => 'cf_lang', 'fieldKey' => 'contact.preferred_language'],
                    ],
                ], 200);
            }
            if (str_contains($url, '/contacts/upsert')) {
                $sequence[] = 'upsert';

                return Http::response(['contact' => ['id' => 'c_org']], 200);
            }
            if ($method === 'DELETE' && str_contains($url, '/tags')) {
                $sequence[] = 'tag_delete';

                return Http::response([], 200);
            }
            if ($method === 'POST' && str_contains($url, '/tags')) {
                $sequence[] = 'tag_add';

                return Http::response([], 200);
            }
            if (str_contains($url, '/notes')
                || str_contains($url, '/conversations')
                || str_contains($url, '/opportunities')) {
                $sequence[] = 'forbidden_'.$method.'_'.$url;

                return Http::response(['error' => 'should not be called'], 500);
            }

            return Http::response(['ok' => true], 200);
        });

        app(GoHighLevelSyncService::class)->syncInquiry([
            'inquiry_id' => 202,
            'type' => 'organization',
            'email' => 'corp2@example.com',
            'name' => 'Corp Lead',
            'company_name' => 'Acme Corp',
            'phone' => '+60123456789',
            'country' => 'MY',
            'course_title' => 'PMP Live',
            'course_slug' => 'pmp-live',
            'message' => 'We need a private cohort for 20 people.',
            'lang' => 'en',
        ]);

        $this->assertSame(['upsert', 'tag_delete', 'tag_add'], $sequence);

        Http::assertSent(function ($request) {
            if (! str_contains($request->url(), '/contacts/upsert')) {
                return false;
            }
            $custom = collect($request['customFields'] ?? []);
            $tags = $request['tags'] ?? null;

            return ($request['firstName'] ?? null) === 'Corp'
                && ($request['lastName'] ?? null) === 'Lead'
                && ($request['name'] ?? null) === 'Corp Lead'
                && ($request['email'] ?? null) === 'corp2@example.com'
                && ($request['phone'] ?? null) === '+60123456789'
                && ($request['country'] ?? null) === 'MY'
                && ($request['companyName'] ?? null) === 'Acme Corp'
                && ($request['source'] ?? null) === 'Website - For Organizations'
                && ($tags === null || $tags === [])
                && $custom->contains(fn ($row) => ($row['id'] ?? null) === 'cf_target'
                    && ($row['field_value'] ?? null) === 'PMP Live')
                && $custom->contains(fn ($row) => ($row['id'] ?? null) === 'cf_message'
                    && ($row['field_value'] ?? null) === 'We need a private cohort for 20 people.');
        });

        Http::assertSent(function ($request) {
            return strtoupper($request->method()) === 'DELETE'
                && str_contains($request->url(), '/contacts/c_org/tags')
                && ($request['tags'] ?? null) === ['corporate-inquiry'];
        });

        Http::assertSent(function ($request) {
            $tags = $request['tags'] ?? [];

            return strtoupper($request->method()) === 'POST'
                && str_contains($request->url(), '/contacts/c_org/tags')
                && $tags === ['corporate-inquiry', 'website-organization', 'course-pmp-live']
                && ! in_array('course-inquiry', $tags, true);
        });

        Http::assertNotSent(fn ($request) => str_contains($request->url(), '/notes'));
        Http::assertNotSent(fn ($request) => str_contains($request->url(), '/conversations'));
        Http::assertNotSent(fn ($request) => str_contains($request->url(), '/opportunities'));

        $this->assertDatabaseHas('ghl_sync_logs', [
            'entity_id' => '202',
            'action' => 'org_upsert',
            'status' => 'success',
        ]);
        $this->assertDatabaseHas('ghl_sync_logs', [
            'entity_id' => '202',
            'action' => 'org_tag_remove',
            'status' => 'success',
        ]);
        $this->assertDatabaseHas('ghl_sync_logs', [
            'entity_id' => '202',
            'action' => 'org_tag_add',
            'status' => 'success',
        ]);
        $this->assertDatabaseHas('ghl_sync_logs', [
            'entity_id' => '202',
            'action' => 'organization_inquiry',
            'status' => 'success',
        ]);
    }

    public function test_organization_inquiry_upsert_failure_skips_tags(): void
    {
        $this->enableGhl();
        app(GoHighLevelClient::class)->clearCustomFieldsCache();

        $tagCalled = false;

        Http::fake(function (\Illuminate\Http\Client\Request $request) use (&$tagCalled) {
            $url = $request->url();

            if (str_contains($url, '/customFields') || str_contains($url, '/custom-fields/')) {
                return Http::response(['customFields' => []], 200);
            }
            if (str_contains($url, '/contacts/upsert')) {
                return Http::response(['message' => 'upsert failed'], 500);
            }
            if (str_contains($url, '/tags')) {
                $tagCalled = true;

                return Http::response([], 200);
            }

            return Http::response(['ok' => true], 200);
        });

        app(GoHighLevelSyncService::class)->syncInquiry([
            'inquiry_id' => 880,
            'type' => 'organization',
            'email' => 'orgfail@example.com',
            'name' => 'Org Fail',
            'company_name' => 'Fail Corp',
            'phone' => '+60123456789',
            'message' => 'This org upsert should fail before tags.',
            'lang' => 'en',
        ]);

        $this->assertFalse($tagCalled);
        $this->assertDatabaseHas('ghl_sync_logs', [
            'entity_id' => '880',
            'action' => 'org_upsert',
            'status' => 'failed',
            'http_status' => 500,
        ]);
        $this->assertDatabaseMissing('ghl_sync_logs', [
            'entity_id' => '880',
            'action' => 'organization_inquiry',
            'status' => 'success',
        ]);
    }

    public function test_organization_inquiry_tag_remove_failure_still_adds_tags(): void
    {
        $this->enableGhl();
        app(GoHighLevelClient::class)->clearCustomFieldsCache();

        $tagAddCalled = false;

        Http::fake(function (\Illuminate\Http\Client\Request $request) use (&$tagAddCalled) {
            $url = $request->url();
            $method = strtoupper($request->method());

            if (str_contains($url, '/customFields') || str_contains($url, '/custom-fields/')) {
                return Http::response(['customFields' => []], 200);
            }
            if (str_contains($url, '/contacts/upsert')) {
                return Http::response(['contact' => ['id' => 'c_org_tag']], 200);
            }
            if ($method === 'DELETE' && str_contains($url, '/tags')) {
                return Http::response(['message' => 'delete failed'], 500);
            }
            if ($method === 'POST' && str_contains($url, '/tags')) {
                $tagAddCalled = true;

                return Http::response([], 200);
            }

            return Http::response(['ok' => true], 200);
        });

        app(GoHighLevelSyncService::class)->syncInquiry([
            'inquiry_id' => 881,
            'type' => 'organization',
            'email' => 'orgretag@example.com',
            'name' => 'Org Retag',
            'company_name' => 'Retag Corp',
            'phone' => '+60123456789',
            'course_slug' => 'pmp-live',
            'course_title' => 'PMP Live',
            'message' => 'Org tag delete failure should not block tag add.',
            'lang' => 'en',
        ]);

        $this->assertTrue($tagAddCalled);
        $this->assertDatabaseHas('ghl_sync_logs', [
            'entity_id' => '881',
            'action' => 'org_tag_remove',
            'status' => 'failed',
            'http_status' => 500,
        ]);
        $this->assertDatabaseHas('ghl_sync_logs', [
            'entity_id' => '881',
            'action' => 'org_tag_add',
            'status' => 'success',
        ]);
    }

    public function test_organization_inquiry_requires_phone_and_company(): void
    {
        Bus::fake([SyncGhlInquiry::class]);

        $this->postJson('/api/v1/inquiries', [
            'type' => 'organization',
            'full_name' => 'No Phone Org',
            'email' => 'nophone-org@example.com',
            'company_name' => 'Acme Corp',
            'message' => str_repeat('We need corporate training for our team. ', 2),
            'lang' => 'en',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['phone_number']);

        $this->postJson('/api/v1/inquiries', [
            'type' => 'organization',
            'full_name' => 'No Company',
            'email' => 'nocompany@example.com',
            'phone_number' => '+60123456789',
            'message' => str_repeat('We need corporate training for our team. ', 2),
            'lang' => 'en',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['company_name']);

        Bus::assertNotDispatched(SyncGhlInquiry::class);
    }

    public function test_sync_registration_uses_lead_stage_and_tags(): void
    {
        $this->enableGhl();
        $user = User::factory()->create([
            'email' => 'new@example.com',
            'first_name' => 'New',
            'last_name' => 'User',
            'phone_number' => '+60111111111',
        ]);

        Http::fake([
            'services.leadconnectorhq.com/locations/*/customFields*' => Http::response(['customFields' => []], 200),
            'services.leadconnectorhq.com/contacts/upsert' => Http::response(['contact' => ['id' => 'c_reg']], 200),
            'services.leadconnectorhq.com/contacts/*/tags' => Http::response([], 200),
            'services.leadconnectorhq.com/opportunities/upsert' => Http::response(['opportunity' => ['id' => 'o_1']], 200),
        ]);

        app(GoHighLevelSyncService::class)->syncRegistration([
            'user_id' => $user->id,
            'lang' => 'ar',
        ]);

        $user->refresh();
        $this->assertSame('c_reg', $user->ghl_contact_id);

        Http::assertSent(function ($request) {
            if (! str_contains($request->url(), '/contacts/') || ! str_ends_with($request->url(), '/tags')) {
                return false;
            }

            $tags = $request['tags'] ?? [];

            return in_array('website-signup', $tags, true)
                && in_array('lang-ar', $tags, true);
        });

        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/opportunities/upsert')
                && ($request['pipelineStageId'] ?? null) === 'stage_lead'
                && ($request['contactId'] ?? null) === 'c_reg';
        });
    }

    public function test_payment_succeeded_is_idempotent_on_retry(): void
    {
        $this->enableGhl();
        $user = User::factory()->create(['email' => 'paid@example.com']);
        $course = Course::factory()->create(['slug' => 'pmp-live', 'title' => 'PMP']);
        $order = Order::factory()->create([
            'user_id' => $user->id,
            'course_id' => $course->id,
            'payment_status' => PaymentStatus::Paid,
            'amount' => 599,
            'stripe_payment_intent_id' => 'pi_idem_1',
            'billing_email' => $user->email,
        ]);

        Http::fake([
            'services.leadconnectorhq.com/locations/*/customFields*' => Http::response(['customFields' => []], 200),
            'services.leadconnectorhq.com/contacts/upsert' => Http::response(['contact' => ['id' => 'c_pay']], 200),
            'services.leadconnectorhq.com/contacts/*/tags' => Http::response([], 200),
            'services.leadconnectorhq.com/opportunities/upsert' => Http::response(['id' => 'o_won'], 200),
        ]);

        $sync = app(GoHighLevelSyncService::class);
        $sync->syncPaymentSucceeded(['order_id' => $order->id, 'lang' => 'en']);
        $sync->syncPaymentSucceeded(['order_id' => $order->id, 'lang' => 'en']);

        $upserts = collect(Http::recorded())
            ->filter(fn ($pair) => str_contains($pair[0]->url(), '/contacts/upsert'));

        $this->assertCount(1, $upserts);
    }

    public function test_webhook_rejects_wrong_secret(): void
    {
        $this->enableGhl();

        $this->postJson('/api/webhooks/gohighlevel', ['action' => 'contact.updated'], [
            'X-CH-Webhook-Secret' => 'wrong',
        ])->assertUnauthorized();
    }

    public function test_webhook_contact_updated_updates_user(): void
    {
        $this->enableGhl();
        Bus::fake([ProcessGhlWebhook::class]);

        $user = User::factory()->create([
            'email' => 'syncme@example.com',
            'ghl_contact_id' => 'c_existing',
            'phone_number' => '+60100000000',
            'first_name' => 'Old',
            'last_name' => 'Name',
        ]);

        $this->postJson('/api/webhooks/gohighlevel', [
            'action' => 'contact.updated',
            'contactId' => 'c_existing',
            'email' => $user->email,
            'phone' => '+60999999999',
            'firstName' => 'New',
            'lastName' => 'Person',
        ], [
            'X-CH-Webhook-Secret' => 'whsec_test',
        ])->assertOk()->assertJson(['ok' => true]);

        Bus::assertDispatched(ProcessGhlWebhook::class);

        // Run the job synchronously to assert side effects.
        app(GoHighLevelSyncService::class)->handleInbound([
            'action' => 'contact.updated',
            'contactId' => 'c_existing',
            'email' => $user->email,
            'phone' => '+60999999999',
            'firstName' => 'New',
            'lastName' => 'Person',
        ]);

        $user->refresh();
        $this->assertSame('+60999999999', $user->phone_number);
        $this->assertSame('New', $user->first_name);
        $this->assertSame('Person', $user->last_name);
    }

    public function test_webhook_enroll_blocked_when_flag_false(): void
    {
        $this->enableGhl();
        config(['services.gohighlevel.inbound_enroll_enabled' => false]);

        $this->postJson('/api/webhooks/gohighlevel', [
            'action' => 'enroll',
            'email' => 'student@example.com',
            'course_slug' => 'pmp-live',
        ], [
            'X-CH-Webhook-Secret' => 'whsec_test',
        ])->assertForbidden();
    }

    public function test_webhook_enroll_is_idempotent_when_enabled(): void
    {
        $this->enableGhl();
        config(['services.gohighlevel.inbound_enroll_enabled' => true]);

        $course = Course::factory()->create(['slug' => 'pmp-live']);
        $user = User::factory()->create(['email' => 'enroll@example.com']);

        $sync = app(GoHighLevelSyncService::class);
        $sync->inboundEnroll([
            'email' => $user->email,
            'course_slug' => $course->slug,
        ]);
        $sync->inboundEnroll([
            'email' => $user->email,
            'course_slug' => $course->slug,
        ]);

        $this->assertSame(1, Order::query()
            ->where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->where('payment_status', PaymentStatus::Paid->value)
            ->count());
    }

    public function test_backfill_dry_run_sends_nothing(): void
    {
        $this->enableGhl();
        Http::fake();

        User::factory()->create(['email' => 'backfill@example.com']);

        $this->artisan('ghl:sync', ['--users' => true, '--dry-run' => true])
            ->assertSuccessful();

        Http::assertNothingSent();
    }

    public function test_create_payment_intent_dispatches_checkout_started_job(): void
    {
        Bus::fake([SyncGhlCheckoutStarted::class]);
        config(['services.stripe.secret' => 'sk_test_ghl']);

        $course = Course::factory()->create(['price' => 1200]);

        $httpClient = \Mockery::mock(\Stripe\HttpClient\ClientInterface::class);
        $httpClient->shouldReceive('request')->once()->andReturn([
            json_encode([
                'id' => 'pi_ghl_1',
                'object' => 'payment_intent',
                'amount' => 120000,
                'currency' => 'usd',
                'client_secret' => 'pi_ghl_1_secret',
                'status' => 'requires_payment_method',
            ]),
            200,
            [],
        ]);
        \Stripe\ApiRequestor::setHttpClient($httpClient);

        try {
            $this->postJson('/api/v1/checkout/create-payment-intent', [
                'course_id' => $course->id,
                'email' => 'buyer@example.com',
                'name' => 'Buyer Name',
                'phone' => '+60123456789',
                'lang' => 'en',
            ])->assertOk();
        } finally {
            \Stripe\ApiRequestor::setHttpClient(null);
        }

        Bus::assertDispatched(SyncGhlCheckoutStarted::class, function (SyncGhlCheckoutStarted $job) use ($course) {
            return ($job->payload['payment_intent_id'] ?? null) === 'pi_ghl_1'
                && ($job->payload['course_slug'] ?? null) === $course->slug
                && in_array('checkout-started', ['checkout-started'], true);
        });
    }
}
