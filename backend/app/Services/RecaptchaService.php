<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RecaptchaService
{
    /**
     * Verify a Google reCAPTCHA token against Google's siteverify API.
     */
    public function verify(?string $token, ?string $remoteIp = null): bool
    {
        $secret = config('services.recaptcha.secret');

        if (blank($secret)) {
            if (app()->environment('local')) {
                Log::warning('reCAPTCHA secret is empty; skipping verification in local environment.');

                return true;
            }

            return false;
        }

        if (blank($token) || mb_strlen($token) > 2000) {
            return false;
        }

        try {
            $response = Http::asForm()
                ->timeout(5)
                ->connectTimeout(3)
                ->post('https://www.google.com/recaptcha/api/siteverify', array_filter([
                    'secret' => $secret,
                    'response' => $token,
                    'remoteip' => $remoteIp,
                ]));

            if (! $response->successful()) {
                Log::warning('reCAPTCHA siteverify HTTP failure.', [
                    'status' => $response->status(),
                ]);

                return false;
            }

            $payload = $response->json();

            return (bool) ($payload['success'] ?? false);
        } catch (\Throwable $e) {
            Log::error('reCAPTCHA verification exception.', [
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
