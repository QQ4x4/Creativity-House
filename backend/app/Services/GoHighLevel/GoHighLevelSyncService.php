<?php

namespace App\Services\GoHighLevel;

use App\Enums\PaymentStatus;
use App\Models\Course;
use App\Models\GhlSyncLog;
use App\Models\Order;
use App\Models\User;
use App\Services\Student\ProgressService;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Business-level website → GHL sync. Failures are logged; never thrown to callers.
 */
class GoHighLevelSyncService
{
    public function __construct(
        private readonly GoHighLevelClient $client,
        private readonly ProgressService $progress,
    ) {}

    /**
     * @param  array{
     *   user_id: int,
     *   lang?: string|null,
     *   country?: string|null,
     *   utm_source?: string|null,
     *   utm_medium?: string|null,
     *   utm_campaign?: string|null,
     *   gclid?: string|null,
     *   fbclid?: string|null,
     * }  $payload
     */
    public function syncRegistration(array $payload): void
    {
        if (! $this->client->isEnabled()) {
            return;
        }

        $user = User::query()->find($payload['user_id'] ?? 0);
        if (! $user) {
            return;
        }

        if (empty($payload['force']) && $this->alreadySucceeded('user', (string) $user->id, 'register')) {
            return;
        }

        try {
            $lang = $this->normalizeLang($payload['lang'] ?? null);
            $contactId = $this->upsertUserContact($user, [
                'country' => $payload['country'] ?? null,
                'preferred_language' => $lang,
                'utm_source' => $payload['utm_source'] ?? null,
                'utm_medium' => $payload['utm_medium'] ?? null,
                'utm_campaign' => $payload['utm_campaign'] ?? null,
                'google_click_id' => $payload['gclid'] ?? null,
                'fbclid' => $payload['fbclid'] ?? null,
            ]);

            if ($contactId === null) {
                $this->logFailure('user', (string) $user->id, 'register', 'Contact upsert failed');

                return;
            }

            $this->client->addTags($contactId, [
                'website-signup',
                'lang-'.$lang,
            ]);

            $stage = $this->client->stageId('lead');
            if ($stage) {
                $this->client->upsertOpportunity([
                    'contactId' => $contactId,
                    'pipelineStageId' => $stage,
                    'name' => 'Website signup – '.$user->email,
                    'status' => 'open',
                ]);
            }

            $this->logSuccess('user', (string) $user->id, 'register', $contactId);
        } catch (Throwable $e) {
            $this->logFailure('user', (string) $user->id, 'register', $e->getMessage());
            throw $e;
        }
    }

    /**
     * @param  array{
     *   inquiry_id?: int|null,
     *   type: string,
     *   email: string,
     *   name: string,
     *   phone?: string|null,
     *   company_name?: string|null,
     *   course_slug?: string|null,
     *   course_title?: string|null,
     *   message?: string|null,
     *   page_url?: string|null,
     *   country?: string|null,
     *   lang?: string|null,
     *   user_id?: int|null,
     *   utm_source?: string|null,
     *   utm_medium?: string|null,
     *   utm_campaign?: string|null,
     *   gclid?: string|null,
     *   fbclid?: string|null,
     * }  $payload
     */
    public function syncInquiry(array $payload): void
    {
        if (! $this->client->isEnabled()) {
            return;
        }

        $type = (string) ($payload['type'] ?? 'user');
        if ($type === 'organization') {
            $this->syncOrganizationInquiry($payload);

            return;
        }

        $this->syncUserContactUsInquiry($payload);
    }

    /**
     * Contact Us / course inquiry — feed GHL only; workflow owns automation.
     * Order: upsert (no tags) → remove course-inquiry → add tags (re-triggers workflow).
     *
     * @param  array<string, mixed>  $payload
     */
    private function syncUserContactUsInquiry(array $payload): void
    {
        $email = mb_strtolower(trim((string) ($payload['email'] ?? '')));
        $entityId = (string) ($payload['inquiry_id'] ?? $email);
        $action = 'course_inquiry';

        if ($this->alreadySucceeded('inquiry', $entityId, $action)) {
            return;
        }

        try {
            $lang = $this->normalizeLang($payload['lang'] ?? null);
            [$first, $last] = $this->splitName((string) ($payload['name'] ?? ''));
            $slug = trim((string) ($payload['course_slug'] ?? ''));
            $courseTitle = (string) ($payload['course_title'] ?? '');

            $custom = $this->client->buildCustomFieldsPayload([
                'target_course' => $courseTitle,
                'contact_message' => (string) ($payload['message'] ?? ''),
                'preferred_language' => $lang,
                'utm_source' => $payload['utm_source'] ?? null,
                'utm_medium' => $payload['utm_medium'] ?? null,
                'utm_campaign' => $payload['utm_campaign'] ?? null,
                'google_click_id' => $payload['gclid'] ?? null,
                'fbclid' => $payload['fbclid'] ?? null,
                'website_user_id' => isset($payload['user_id']) ? (string) $payload['user_id'] : null,
            ]);

            $contactPayload = array_filter([
                'email' => $email,
                'firstName' => $first,
                'lastName' => $last !== '' ? $last : null,
                'name' => trim((string) ($payload['name'] ?? '')),
                'phone' => $payload['phone'] ?? null,
                'country' => $payload['country'] ?? null,
                'source' => 'Website - Contact Us',
                'customFields' => $custom,
            ], static fn ($v) => $v !== null && $v !== '' && $v !== []);

            $upsert = $this->client->upsertContactResult($contactPayload);
            if (! $upsert['ok'] || blank($upsert['id'])) {
                $this->logFailure(
                    'inquiry',
                    $entityId,
                    'inquiry_upsert',
                    $upsert['error'] ?? 'Contact upsert failed',
                    $upsert['http_status'],
                );

                return;
            }

            $contactId = (string) $upsert['id'];
            $this->logSuccess('inquiry', $entityId, 'inquiry_upsert', $contactId);

            $user = User::query()->where('email', $email)->first();
            if ($user && blank($user->ghl_contact_id)) {
                $user->forceFill(['ghl_contact_id' => $contactId])->save();
            }

            $remove = $this->client->removeTagsResult($contactId, ['course-inquiry']);
            if ($remove['ok']) {
                $this->logSuccess('inquiry', $entityId, 'inquiry_tag_remove', $contactId);
            } else {
                $this->logFailure(
                    'inquiry',
                    $entityId,
                    'inquiry_tag_remove',
                    $remove['error'] ?? 'Tag remove failed',
                    $remove['http_status'],
                );
            }

            $tags = array_values(array_filter([
                'course-inquiry',
                'website-contact-us',
                $slug !== '' ? 'course-'.$slug : null,
            ]));
            $add = $this->client->addTagsResult($contactId, $tags);
            if ($add['ok']) {
                $this->logSuccess('inquiry', $entityId, 'inquiry_tag_add', $contactId);
                $this->logSuccess('inquiry', $entityId, $action, $contactId);
            } else {
                $this->logFailure(
                    'inquiry',
                    $entityId,
                    'inquiry_tag_add',
                    $add['error'] ?? 'Tag add failed',
                    $add['http_status'],
                );
            }
        } catch (Throwable $e) {
            $this->logFailure('inquiry', $entityId, $action, $e->getMessage());
            throw $e;
        }
    }

    /**
     * For Organizations inquiry — feed GHL only; workflow owns automation.
     * Order: upsert (no tags) → remove corporate-inquiry → add tags (re-triggers workflow).
     *
     * @param  array<string, mixed>  $payload
     */
    private function syncOrganizationInquiry(array $payload): void
    {
        $email = mb_strtolower(trim((string) ($payload['email'] ?? '')));
        $entityId = (string) ($payload['inquiry_id'] ?? $email);
        $action = 'organization_inquiry';

        if ($this->alreadySucceeded('inquiry', $entityId, $action)) {
            return;
        }

        try {
            $lang = $this->normalizeLang($payload['lang'] ?? null);
            [$first, $last] = $this->splitName((string) ($payload['name'] ?? ''));
            $slug = trim((string) ($payload['course_slug'] ?? ''));
            $courseTitle = (string) ($payload['course_title'] ?? '');

            $custom = $this->client->buildCustomFieldsPayload([
                'target_course' => $courseTitle,
                'contact_message' => (string) ($payload['message'] ?? ''),
                'preferred_language' => $lang,
                'utm_source' => $payload['utm_source'] ?? null,
                'utm_medium' => $payload['utm_medium'] ?? null,
                'utm_campaign' => $payload['utm_campaign'] ?? null,
                'google_click_id' => $payload['gclid'] ?? null,
                'fbclid' => $payload['fbclid'] ?? null,
                'website_user_id' => isset($payload['user_id']) ? (string) $payload['user_id'] : null,
            ]);

            $contactPayload = array_filter([
                'email' => $email,
                'firstName' => $first,
                'lastName' => $last !== '' ? $last : null,
                'name' => trim((string) ($payload['name'] ?? '')),
                'phone' => $payload['phone'] ?? null,
                'country' => $payload['country'] ?? null,
                'companyName' => $payload['company_name'] ?? null,
                'source' => 'Website - For Organizations',
                'customFields' => $custom,
            ], static fn ($v) => $v !== null && $v !== '' && $v !== []);

            $upsert = $this->client->upsertContactResult($contactPayload);
            if (! $upsert['ok'] || blank($upsert['id'])) {
                $this->logFailure(
                    'inquiry',
                    $entityId,
                    'org_upsert',
                    $upsert['error'] ?? 'Contact upsert failed',
                    $upsert['http_status'],
                );

                return;
            }

            $contactId = (string) $upsert['id'];
            $this->logSuccess('inquiry', $entityId, 'org_upsert', $contactId);

            $user = User::query()->where('email', $email)->first();
            if ($user && blank($user->ghl_contact_id)) {
                $user->forceFill(['ghl_contact_id' => $contactId])->save();
            }

            $remove = $this->client->removeTagsResult($contactId, ['corporate-inquiry']);
            if ($remove['ok']) {
                $this->logSuccess('inquiry', $entityId, 'org_tag_remove', $contactId);
            } else {
                $this->logFailure(
                    'inquiry',
                    $entityId,
                    'org_tag_remove',
                    $remove['error'] ?? 'Tag remove failed',
                    $remove['http_status'],
                );
            }

            $tags = array_values(array_filter([
                'corporate-inquiry',
                'website-organization',
                $slug !== '' ? 'course-'.$slug : null,
            ]));
            $add = $this->client->addTagsResult($contactId, $tags);
            if ($add['ok']) {
                $this->logSuccess('inquiry', $entityId, 'org_tag_add', $contactId);
                $this->logSuccess('inquiry', $entityId, $action, $contactId);
            } else {
                $this->logFailure(
                    'inquiry',
                    $entityId,
                    'org_tag_add',
                    $add['error'] ?? 'Tag add failed',
                    $add['http_status'],
                );
            }
        } catch (Throwable $e) {
            $this->logFailure('inquiry', $entityId, $action, $e->getMessage());
            throw $e;
        }
    }

    /**
     * @param  array{
     *   email: string,
     *   name: string,
     *   phone?: string|null,
     *   country?: string|null,
     *   course_id: int,
     *   course_slug?: string|null,
     *   course_title?: string|null,
     *   mode?: string|null,
     *   amount: float|int|string,
     *   currency?: string|null,
     *   payment_intent_id: string,
     *   lang?: string|null,
     *   user_id?: int|null,
     *   utm_source?: string|null,
     *   utm_medium?: string|null,
     *   utm_campaign?: string|null,
     *   gclid?: string|null,
     *   fbclid?: string|null,
     * }  $payload
     */
    public function syncCheckoutStarted(array $payload): void
    {
        if (! $this->client->isEnabled()) {
            return;
        }

        $pi = (string) ($payload['payment_intent_id'] ?? '');
        if ($pi !== '' && $this->alreadySucceeded('payment_intent', $pi, 'checkout_started')) {
            return;
        }

        try {
            $lang = $this->normalizeLang($payload['lang'] ?? null);
            $email = mb_strtolower(trim((string) ($payload['email'] ?? '')));
            [$first, $last] = $this->splitName((string) ($payload['name'] ?? ''));
            $slug = (string) ($payload['course_slug'] ?? '');
            $amount = number_format((float) ($payload['amount'] ?? 0), 2, '.', '');
            $currency = strtoupper((string) ($payload['currency'] ?? 'USD'));

            $custom = $this->client->buildCustomFieldsPayload([
                'website_user_id' => isset($payload['user_id']) ? (string) $payload['user_id'] : null,
                'last_course' => $payload['course_title'] ?? null,
                'last_course_mode' => $payload['mode'] ?? null,
                'last_order_amount' => $amount,
                'last_order_currency' => $currency,
                'preferred_language' => $lang,
                'utm_source' => $payload['utm_source'] ?? null,
                'utm_medium' => $payload['utm_medium'] ?? null,
                'utm_campaign' => $payload['utm_campaign'] ?? null,
                'google_click_id' => $payload['gclid'] ?? null,
                'fbclid' => $payload['fbclid'] ?? null,
            ]);

            $contactId = $this->client->upsertContact(array_filter([
                'email' => $email,
                'firstName' => $first,
                'lastName' => $last,
                'name' => trim((string) ($payload['name'] ?? '')),
                'phone' => $payload['phone'] ?? null,
                'country' => $payload['country'] ?? null,
                'source' => 'Website',
                'tags' => array_values(array_filter([
                    'checkout-started',
                    $slug !== '' ? 'course-'.$slug : null,
                ])),
                'customFields' => $custom,
            ], static fn ($v) => $v !== null && $v !== '' && $v !== []));

            if ($contactId === null) {
                $this->logFailure('payment_intent', $pi, 'checkout_started', 'Contact upsert failed');

                return;
            }

            if (! empty($payload['user_id'])) {
                User::query()->whereKey((int) $payload['user_id'])
                    ->whereNull('ghl_contact_id')
                    ->update(['ghl_contact_id' => $contactId]);
            }

            $stage = $this->client->stageId('checkout');
            if ($stage) {
                $this->client->upsertOpportunity([
                    'contactId' => $contactId,
                    'pipelineStageId' => $stage,
                    'name' => trim((string) ($payload['course_title'] ?? 'Course')).' – Checkout',
                    'status' => 'open',
                    'monetaryValue' => (float) $amount,
                ]);
            }

            $this->logSuccess('payment_intent', $pi, 'checkout_started', $contactId);
        } catch (Throwable $e) {
            $this->logFailure('payment_intent', $pi, 'checkout_started', $e->getMessage());
            throw $e;
        }
    }

    /**
     * @param  array{order_id: int, lang?: string|null}  $payload
     */
    public function syncPaymentSucceeded(array $payload): void
    {
        if (! $this->client->isEnabled()) {
            return;
        }

        $order = Order::query()->with(['user', 'course'])->find($payload['order_id'] ?? 0);
        if (! $order || $order->payment_status !== PaymentStatus::Paid) {
            return;
        }

        $dedupeKey = (string) ($order->stripe_payment_intent_id
            ?: $order->stripe_session_id
            ?: $order->id);

        if (empty($payload['force']) && $this->alreadySucceeded('payment_intent', $dedupeKey, 'payment_succeeded')) {
            return;
        }

        try {
            $user = $order->user;
            $course = $order->course;
            $lang = $this->normalizeLang($payload['lang'] ?? null);
            $slug = (string) ($course?->slug ?? '');
            $title = $this->courseTitle($course, $lang);
            $amount = number_format((float) $order->amount, 2, '.', '');
            $currency = strtoupper((string) ($order->currency ?: 'USD'));
            $enrolledTitles = $this->enrolledCourseTitles($user, $lang);
            $courseUrl = 'https://www.creativity-house.com/'.$lang.'/courses/'.($course?->id ?? '').'/learn';

            $custom = $this->client->buildCustomFieldsPayload([
                'website_user_id' => $user ? (string) $user->id : null,
                'last_course' => $title,
                'last_course_mode' => $order->delivery_mode,
                'last_order_amount' => $amount,
                'last_order_currency' => $currency,
                'enrolled_courses' => implode(', ', $enrolledTitles),
                'last_enrolled_at' => ($order->paid_at ?? now())->toDateString(),
                'course_url' => $courseUrl,
                'preferred_language' => $lang,
            ]);

            [$first, $last] = $this->splitName(
                trim(($order->billing_first_name ?? '').' '.($order->billing_last_name ?? ''))
                    ?: (string) ($user?->name ?? '')
            );

            $contactId = $this->client->upsertContact(array_filter([
                'email' => $order->billing_email ?: $user?->email,
                'firstName' => $first ?: $user?->first_name,
                'lastName' => $last ?: $user?->last_name,
                'name' => $user?->name,
                'phone' => $order->billing_phone ?: $user?->phone_number,
                'country' => $order->billing_country,
                'source' => 'Website',
                'customFields' => $custom,
            ], static fn ($v) => $v !== null && $v !== '' && $v !== []));

            if ($contactId === null) {
                $this->logFailure('order', (string) $order->id, 'payment_succeeded', 'Contact upsert failed');

                return;
            }

            $this->client->removeTags($contactId, ['checkout-started']);
            $this->client->addTags($contactId, array_values(array_filter([
                'customer',
                $slug !== '' ? 'paid-'.$slug : null,
            ])));

            $stage = $this->client->stageId('won');
            $opportunityId = null;
            if ($stage) {
                $opportunityId = $this->client->upsertOpportunity([
                    'contactId' => $contactId,
                    'pipelineStageId' => $stage,
                    'name' => $title.' – Paid',
                    'status' => 'won',
                    'monetaryValue' => (float) $order->amount,
                ]);
            }

            $order->forceFill([
                'ghl_contact_id' => $contactId,
                'ghl_opportunity_id' => $opportunityId ?: $order->ghl_opportunity_id,
            ])->save();

            if ($user) {
                $user->forceFill(['ghl_contact_id' => $contactId])->save();
            }

            $this->logSuccess('payment_intent', $dedupeKey, 'payment_succeeded', $contactId);
        } catch (Throwable $e) {
            $this->logFailure('payment_intent', $dedupeKey, 'payment_succeeded', $e->getMessage());
            throw $e;
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function handleInbound(array $payload): void
    {
        $action = (string) ($payload['action'] ?? '');
        $entityId = (string) ($payload['email'] ?? $payload['contactId'] ?? $payload['ghl_contact_id'] ?? 'unknown');

        try {
            match ($action) {
                'contact.updated' => $this->inboundContactUpdated($payload),
                'contact.unsubscribed' => $this->inboundUnsubscribed($payload),
                'enroll' => $this->inboundEnroll($payload),
                default => Log::info('GoHighLevel inbound action ignored.', ['action' => $action]),
            };

            $this->logSuccess('webhook', $entityId, $action !== '' ? $action : 'unknown', null);
        } catch (Throwable $e) {
            $this->logFailure('webhook', $entityId, $action !== '' ? $action : 'unknown', $e->getMessage());
            throw $e;
        }
    }

    /**
     * Grant enrollment from GHL (amount 0, source ghl). Idempotent by email+course.
     *
     * @param  array{email?: string, course_slug?: string}  $payload
     */
    public function inboundEnroll(array $payload): void
    {
        if (! config('services.gohighlevel.inbound_enroll_enabled')) {
            Log::warning('GoHighLevel inbound enroll blocked (flag disabled).');
            throw new \RuntimeException('inbound_enroll_disabled');
        }

        $email = mb_strtolower(trim((string) ($payload['email'] ?? '')));
        $slug = trim((string) ($payload['course_slug'] ?? ''));
        if ($email === '' || $slug === '') {
            throw new \InvalidArgumentException('enroll requires email and course_slug');
        }

        $course = Course::query()->where('slug', $slug)->first();
        if (! $course) {
            throw new \InvalidArgumentException('course not found: '.$slug);
        }

        $user = User::query()->where('email', $email)->first();
        if (! $user) {
            $local = strstr($email, '@', true) ?: 'Student';
            $user = User::query()->create([
                'first_name' => $local,
                'last_name' => '',
                'name' => $local,
                'email' => $email,
                'password' => bcrypt(str()->random(32)),
                'is_active' => true,
                'email_verified_at' => now(),
            ]);
        }

        $existing = Order::query()
            ->where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->where('payment_status', PaymentStatus::Paid->value)
            ->first();

        if ($existing) {
            $this->progress->progressFor($user, $course);

            return;
        }

        Order::query()->create([
            'user_id' => $user->id,
            'course_id' => $course->id,
            'amount' => 0,
            'currency' => $course->currency ?: 'USD',
            'payment_status' => PaymentStatus::Paid,
            'paid_at' => now(),
            'billing_email' => $user->email,
            'billing_first_name' => $user->first_name,
            'billing_last_name' => $user->last_name,
            'billing_phone' => $user->phone_number,
            'delivery_mode' => $course->default_mode ?: 'live',
            'reference' => 'GHL-'.strtoupper(substr(md5($email.'|'.$slug), 0, 10)),
        ]);

        $this->progress->progressFor($user, $course);
    }

    /**
     * @param  array<string, mixed>  $attribution
     */
    private function upsertUserContact(User $user, array $attribution): ?string
    {
        $custom = $this->client->buildCustomFieldsPayload([
            'website_user_id' => (string) $user->id,
            'preferred_language' => $attribution['preferred_language'] ?? null,
            'utm_source' => $attribution['utm_source'] ?? null,
            'utm_medium' => $attribution['utm_medium'] ?? null,
            'utm_campaign' => $attribution['utm_campaign'] ?? null,
            'google_click_id' => $attribution['google_click_id'] ?? null,
            'fbclid' => $attribution['fbclid'] ?? null,
        ]);

        $contactId = $this->client->upsertContact(array_filter([
            'email' => $user->email,
            'firstName' => $user->first_name,
            'lastName' => $user->last_name,
            'name' => $user->name,
            'phone' => $user->phone_number,
            'country' => $attribution['country'] ?? null,
            'source' => 'Website',
            'customFields' => $custom,
        ], static fn ($v) => $v !== null && $v !== '' && $v !== []));

        if ($contactId) {
            $user->forceFill(['ghl_contact_id' => $contactId])->save();
        }

        return $contactId;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function inboundContactUpdated(array $payload): void
    {
        $ghlId = (string) ($payload['ghl_contact_id'] ?? $payload['contactId'] ?? '');
        $email = mb_strtolower(trim((string) ($payload['email'] ?? '')));

        $user = null;
        if ($ghlId !== '') {
            $user = User::query()->where('ghl_contact_id', $ghlId)->first();
        }
        if (! $user && $email !== '') {
            $user = User::query()->where('email', $email)->first();
        }
        if (! $user) {
            return;
        }

        $updates = [];
        if (isset($payload['phone']) && is_string($payload['phone']) && $payload['phone'] !== '') {
            $updates['phone_number'] = $payload['phone'];
        }
        if (isset($payload['firstName']) || isset($payload['lastName']) || isset($payload['name'])) {
            $first = (string) ($payload['firstName'] ?? $user->first_name ?? '');
            $last = (string) ($payload['lastName'] ?? $user->last_name ?? '');
            if (isset($payload['name']) && is_string($payload['name']) && $payload['name'] !== '') {
                [$first, $last] = $this->splitName($payload['name']);
            }
            if ($first !== '') {
                $updates['first_name'] = $first;
            }
            if ($last !== '') {
                $updates['last_name'] = $last;
            }
            $updates['name'] = trim($first.' '.$last) ?: $user->name;
        }

        if ($updates !== []) {
            $user->forceFill($updates)->save();
        }

        if ($ghlId !== '' && blank($user->ghl_contact_id)) {
            $user->forceFill(['ghl_contact_id' => $ghlId])->save();
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function inboundUnsubscribed(array $payload): void
    {
        $ghlId = (string) ($payload['ghl_contact_id'] ?? $payload['contactId'] ?? '');
        $email = mb_strtolower(trim((string) ($payload['email'] ?? '')));

        $query = User::query();
        if ($ghlId !== '') {
            $query->where('ghl_contact_id', $ghlId);
        } elseif ($email !== '') {
            $query->where('email', $email);
        } else {
            return;
        }

        $query->update(['marketing_opt_out' => true]);
    }

    /**
     * @return list<string>
     */
    private function enrolledCourseTitles(?User $user, string $lang): array
    {
        if (! $user) {
            return [];
        }

        $courseIds = Order::query()
            ->where('user_id', $user->id)
            ->where('payment_status', PaymentStatus::Paid->value)
            ->pluck('course_id')
            ->unique()
            ->all();

        if ($courseIds === []) {
            return [];
        }

        return Course::query()
            ->whereIn('id', $courseIds)
            ->get()
            ->map(fn (Course $c) => $this->courseTitle($c, $lang))
            ->filter()
            ->values()
            ->all();
    }

    private function courseTitle(?Course $course, string $lang): string
    {
        if (! $course) {
            return '';
        }

        if ($lang === 'ar') {
            return (string) ($course->title_ar ?: $course->title_en ?: $course->title);
        }

        return (string) ($course->title_en ?: $course->title_ar ?: $course->title);
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function splitName(string $name): array
    {
        $name = trim(preg_replace('/\s+/u', ' ', $name) ?? '');
        if ($name === '') {
            return ['', ''];
        }
        $parts = explode(' ', $name, 2);

        return [$parts[0], $parts[1] ?? ''];
    }

    private function normalizeLang(?string $lang): string
    {
        return strtolower((string) $lang) === 'ar' ? 'ar' : 'en';
    }

    private function alreadySucceeded(string $entityType, string $entityId, string $action): bool
    {
        return GhlSyncLog::query()
            ->where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->where('action', $action)
            ->where('status', 'success')
            ->exists();
    }

    private function logSuccess(
        string $entityType,
        string $entityId,
        string $action,
        ?string $ghlId,
    ): void {
        GhlSyncLog::query()->create([
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'action' => $action,
            'status' => 'success',
            'http_status' => 200,
            'ghl_id' => $ghlId,
            'error' => null,
            'attempts' => 1,
        ]);
    }

    private function logFailure(
        string $entityType,
        string $entityId,
        string $action,
        string $error,
        ?int $httpStatus = null,
    ): void {
        GhlSyncLog::query()->create([
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'action' => $action,
            'status' => 'failed',
            'http_status' => $httpStatus,
            'ghl_id' => null,
            'error' => mb_substr($error, 0, 2000),
            'attempts' => 1,
        ]);
    }

}
