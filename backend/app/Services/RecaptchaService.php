<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RecaptchaService
{
    /**
     * Verify a Google reCAPTCHA v3 token (success + minimum score).
     *
     * @param  string|null  $expectedAction  Optional action name from executeRecaptcha (e.g. login).
     */
    public function verify(?string $token, ?string $remoteIp = null, ?string $expectedAction = null): bool
    {
        $secret = config('services.recaptcha.secret');

        if (blank($secret)) {
            if (app()->environment('local')) {
                Log::warning('reCAPTCHA secret is empty; skipping verification in local environment.');

                return true;
            }

            return false;
        }

        if (blank($token) || mb_strlen($token) > (int) config('field_limits.recaptcha', 10000)) {
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

            /** @var array<string, mixed>|null $payload */
            $payload = $response->json();

            if (! is_array($payload) || ! ($payload['success'] ?? false)) {
                Log::warning('reCAPTCHA verification failed.', [
                    'error_codes' => $payload['error-codes'] ?? null,
                ]);

                return false;
            }

            $score = (float) ($payload['score'] ?? 0);
            $minScore = (float) config('services.recaptcha.min_score', 0.5);

            if ($score < $minScore) {
                Log::warning('reCAPTCHA score below threshold.', [
                    'score' => $score,
                    'min_score' => $minScore,
                    'action' => $payload['action'] ?? null,
                ]);

                return false;
            }

            if (
                $expectedAction !== null
                && $expectedAction !== ''
                && ($payload['action'] ?? null) !== $expectedAction
            ) {
                Log::warning('reCAPTCHA action mismatch.', [
                    'expected' => $expectedAction,
                    'received' => $payload['action'] ?? null,
                ]);

                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('reCAPTCHA verification exception.', [
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
