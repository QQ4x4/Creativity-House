<?php

/**
 * Build the allow-list of browser origins for credentialed CORS.
 * Localhost is always included so WAMP/dev keeps working.
 * Production origins come from FRONTEND_URL + optional CORS_ALLOWED_ORIGINS.
 */
$defaultOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
];

$configured = [];

$frontendUrl = env('FRONTEND_URL');
if (filled($frontendUrl)) {
    $configured[] = rtrim((string) $frontendUrl, '/');
}

$extraOrigins = env('CORS_ALLOWED_ORIGINS');
if (filled($extraOrigins)) {
    foreach (explode(',', (string) $extraOrigins) as $origin) {
        $origin = trim($origin);
        if ($origin !== '') {
            $configured[] = rtrim($origin, '/');
        }
    }
}

$allowedOrigins = array_values(array_unique(array_filter([
    ...$defaultOrigins,
    ...$configured,
])));

$originPatterns = [
    // Vercel production + preview deployments (*.vercel.app)
    '#^https://.*\.vercel\.app$#',
];

$extraPattern = env('CORS_ORIGIN_PATTERN');
if (filled($extraPattern)) {
    $originPatterns[] = (string) $extraPattern;
}

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'auth/*', 'up'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => $originPatterns,

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // Required for Sanctum cookie auth (Vercel ↔ Railway)
    'supports_credentials' => true,

];
