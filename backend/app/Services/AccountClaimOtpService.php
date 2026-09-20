<?php

namespace App\Services;

use App\Mail\AccountClaimOtpMail;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Throwable;

class AccountClaimOtpService
{
    public const EXPIRY_MINUTES = 15;

    public const MAX_ATTEMPTS = 5;

    public function issue(User $user, string $paymentIntentId, string $courseTitle = ''): void
    {
        $code = (string) random_int(100000, 999999);
        $hash = Hash::make($code);
        $expiresAt = now()->addMinutes(self::EXPIRY_MINUTES);

        $user->forceFill([
            'verification_code' => $hash,
            'code_expires_at' => $expiresAt,
        ])->save();

        Cache::put(
            $this->cacheKey($paymentIntentId),
            [
                'user_id' => $user->id,
                'email' => mb_strtolower($user->email),
                'otp_hash' => $hash,
            ],
            $expiresAt
        );

        // Fresh code resets brute-force counter for this payment intent.
        $this->clearAttempts($paymentIntentId);

        $this->sendMail($user, $code, $courseTitle);
    }

    public function sendMail(User $user, string $code, string $courseTitle = ''): void
    {
        $userId = (int) $user->id;
        $email = (string) $user->email;

        // Defer SMTP until after the HTTP response so claim-info / enrollment stay fast.
        dispatch(function () use ($userId, $email, $code, $courseTitle): void {
            try {
                $user = User::query()->find($userId);
                if ($user === null) {
                    return;
                }

                Mail::to($email)->send(new AccountClaimOtpMail($user, $code, $courseTitle));

                Log::info('Account claim OTP email sent.', [
                    'user_id' => $userId,
                    'email' => $email,
                ]);

                if (app()->environment('local')) {
                    Log::debug('Local account-claim OTP (dev only).', [
                        'email' => $email,
                        'code' => $code,
                    ]);
                }
            } catch (Throwable $e) {
                Log::error('Account claim OTP email failed.', [
                    'user_id' => $userId,
                    'email' => $email,
                    'mailer' => config('mail.default'),
                    'message' => $e->getMessage(),
                    'exception' => $e::class,
                ]);

                if (app()->environment('local')) {
                    Log::warning('Claim OTP available in logs because mail failed (local only).', [
                        'email' => $email,
                        'code' => $code,
                    ]);
                }
            }
        })->afterResponse();
    }

    public function verify(User $user, string $paymentIntentId, string $code): bool
    {
        if ($this->attemptCount($paymentIntentId) >= self::MAX_ATTEMPTS) {
            throw ValidationException::withMessages([
                'code' => ['Too many attempts. Request a new code.'],
            ]);
        }

        $valid = $this->matchesOtp($user, $paymentIntentId, $code);

        if (! $valid) {
            $attempts = $this->recordFailedAttempt($paymentIntentId);

            if ($attempts >= self::MAX_ATTEMPTS) {
                $this->clear($paymentIntentId, $user);

                throw ValidationException::withMessages([
                    'code' => ['Too many attempts. Request a new code.'],
                ]);
            }

            return false;
        }

        $this->clearAttempts($paymentIntentId);

        return true;
    }

    public function clear(string $paymentIntentId, User $user): void
    {
        Cache::forget($this->cacheKey($paymentIntentId));
        $this->clearAttempts($paymentIntentId);

        $user->forceFill([
            'verification_code' => null,
            'code_expires_at' => null,
        ])->save();
    }

    private function matchesOtp(User $user, string $paymentIntentId, string $code): bool
    {
        $cached = Cache::get($this->cacheKey($paymentIntentId));

        if (! is_array($cached)) {
            return $this->verifyAgainstUser($user, $code);
        }

        if ((int) ($cached['user_id'] ?? 0) !== (int) $user->id) {
            return false;
        }

        if (mb_strtolower((string) ($cached['email'] ?? '')) !== mb_strtolower($user->email)) {
            return false;
        }

        $hash = (string) ($cached['otp_hash'] ?? '');
        if ($hash === '' || ! Hash::check($code, $hash)) {
            return false;
        }

        return true;
    }

    private function verifyAgainstUser(User $user, string $code): bool
    {
        if (blank($user->verification_code) || blank($user->code_expires_at)) {
            return false;
        }

        if ($user->code_expires_at->isPast()) {
            return false;
        }

        return Hash::check($code, $user->verification_code);
    }

    private function attemptCount(string $paymentIntentId): int
    {
        return (int) Cache::get($this->attemptsKey($paymentIntentId), 0);
    }

    private function recordFailedAttempt(string $paymentIntentId): int
    {
        $key = $this->attemptsKey($paymentIntentId);
        $attempts = $this->attemptCount($paymentIntentId) + 1;
        Cache::put($key, $attempts, now()->addMinutes(self::EXPIRY_MINUTES));

        return $attempts;
    }

    private function clearAttempts(string $paymentIntentId): void
    {
        Cache::forget($this->attemptsKey($paymentIntentId));
    }

    private function cacheKey(string $paymentIntentId): string
    {
        return 'account_claim_otp:'.$paymentIntentId;
    }

    private function attemptsKey(string $paymentIntentId): string
    {
        return 'claim_otp_attempts:'.$paymentIntentId;
    }
}
