<?php

namespace App\Services;

use App\Mail\OtpVerificationMail;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class OtpService
{
    public const EXPIRY_MINUTES = 10;

    /**
     * Generate a secure 6-digit OTP, store a hash on the user, and email the plaintext code.
     *
     * @throws Throwable when SMTP delivery fails (caller may catch and decide response).
     */
    public function issue(User $user): void
    {
        $code = (string) random_int(100000, 999999);

        $user->forceFill([
            'verification_code' => Hash::make($code),
            'code_expires_at' => now()->addMinutes(self::EXPIRY_MINUTES),
        ])->save();

        $this->sendMail($user, $code);
    }

    /**
     * Send the OTP email. Logs SMTP failures with full context.
     *
     * @throws Throwable
     */
    public function sendMail(User $user, string $code): void
    {
        try {
            Mail::to($user->email)->send(new OtpVerificationMail($user, $code));

            Log::info('OTP verification email sent.', [
                'user_id' => $user->id,
                'email' => $user->email,
            ]);

            if (app()->environment('local')) {
                Log::debug('Local OTP code (dev only).', [
                    'email' => $user->email,
                    'code' => $code,
                ]);
            }
        } catch (Throwable $e) {
            Log::error('OTP email delivery failed.', [
                'user_id' => $user->id,
                'email' => $user->email,
                'mailer' => config('mail.default'),
                'from' => config('mail.from.address'),
                'message' => $e->getMessage(),
                'exception' => $e::class,
            ]);

            if (app()->environment('local')) {
                Log::warning('OTP code available in logs because mail delivery failed (local only).', [
                    'email' => $user->email,
                    'code' => $code,
                ]);
            }

            throw $e;
        }
    }

    /**
     * Validate a submitted OTP against the hashed code and expiry window.
     */
    public function verify(User $user, string $code): bool
    {
        if (blank($user->verification_code) || blank($user->code_expires_at)) {
            return false;
        }

        if ($user->code_expires_at->isPast()) {
            return false;
        }

        return Hash::check($code, $user->verification_code);
    }
}
