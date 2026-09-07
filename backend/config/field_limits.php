<?php

/**
 * Canonical string length limits for FormRequest validation.
 * Keep in sync with frontend/lib/fieldLimits.js
 */
return [
    'email' => 254,
    // E.164 allows 15 digits; with leading "+" the string is at most 16 chars.
    'phone' => 16,
    'password' => 64,
    'name' => 100,
    'short' => 100,
    'medium' => 255,
    'long' => 2000,
    // Bounded non-user-prose fields (still capped for DoS).
    'url' => 2048,
    'recaptcha' => 2000,
    'otp' => 12,
    'currency' => 3,
    'slug' => 255,
];
