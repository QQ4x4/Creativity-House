<?php

return [



    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', env('APP_URL').'/auth/google/callback'),
    ],

    'recaptcha' => [
        'secret' => env('RECAPTCHA_SECRET_KEY'),
        'site_key' => env('RECAPTCHA_SITE_KEY'),
        // reCAPTCHA v3 score threshold (0.0 = bot, 1.0 = human).
        'min_score' => (float) env('RECAPTCHA_MIN_SCORE', 0.5),
    ],

    'stripe' => [
        // Prefer STRIPE_* names used by PaymentController; accept common aliases.
        'key' => env('STRIPE_KEY', env('STRIPE_PUBLISHABLE_KEY')),
        'secret' => env('STRIPE_SECRET', env('STRIPE_SECRET_KEY')),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],

    /*
     * Meta (Facebook) Pixel + Conversions API.
     * event_id must match the browser Pixel / GTM dataLayer for deduplication.
     */
    'meta' => [
        'pixel_id' => env('META_PIXEL_ID'),
        'access_token' => env('META_CAPI_ACCESS_TOKEN'),
        'capi_access_token' => env('META_CAPI_ACCESS_TOKEN'), // alias
        'test_code' => env('META_TEST_EVENT_CODE'),
        'test_event_code' => env('META_TEST_EVENT_CODE'), // alias
        'graph_version' => env('META_GRAPH_VERSION', 'v19.0'),
    ],

    /*
     * Google Ads — Data Manager API (events:ingest) for server-side conversions.
     * service_account_json: full JSON key string (or absolute path to the key file).
     */
    'google_ads' => [
        'customer_id' => env('GOOGLE_ADS_CUSTOMER_ID'),
        'lead_action_id' => env('GOOGLE_ADS_LEAD_ACTION_ID'),
        'signup_action_id' => env('GOOGLE_ADS_SIGNUP_ACTION_ID'),
        'service_account_json' => env('GOOGLE_ADS_SERVICE_ACCOUNT_JSON'),
        'validate_only' => filter_var(
            env('GOOGLE_ADS_VALIDATE_ONLY', false),
            FILTER_VALIDATE_BOOLEAN
        ),
    ],

    /*
     * Bunny Stream. The API key is a full-access library credential and must
     * never reach the browser — the admin UI reads videos through
     * GET /api/v1/admin/bunny/videos instead.
     */
    'bunny' => [
        'library_id' => env('BUNNY_STREAM_LIBRARY_ID', '739576'),
        'api_key' => env('BUNNY_STREAM_API_KEY'),
        'base_url' => env('BUNNY_STREAM_BASE_URL', 'https://video.bunnycdn.com'),
    ],

];
