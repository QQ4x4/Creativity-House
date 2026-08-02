<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Mail\PasswordResetMail;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Throwable;

class PasswordResetController extends Controller
{
    public function __construct(
        private readonly OtpService $otp,
    ) {}

    public function forgot(ForgotPasswordRequest $request): JsonResponse
    {
        $email = mb_strtolower($request->string('email')->toString());
        $user = User::query()->where('email', $email)->first();

        // Generic response to avoid account enumeration.
        if ($user && $user->is_active && filled($user->password)) {
            $code = (string) random_int(100000, 999999);

            $user->forceFill([
                'verification_code' => Hash::make($code),
                'code_expires_at' => now()->addMinutes(OtpService::EXPIRY_MINUTES),
            ])->save();

            try {
                Mail::to($user->email)->send(new PasswordResetMail($user, $code));
            } catch (Throwable $e) {
                Log::error('Password reset email delivery failed.', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'mailer' => config('mail.default'),
                    'host' => config('mail.mailers.smtp.host'),
                    'message' => $e->getMessage(),
                    'exception' => $e::class,
                ]);

                if (app()->environment('local')) {
                    Log::warning('Password reset code (local SMTP failure).', [
                        'email' => $user->email,
                        'code' => $code,
                    ]);
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'If an account exists for this email, a reset code has been sent.',
            'email' => $email,
        ]);
    }

    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $email = mb_strtolower($request->string('email')->toString());
        $code = $request->string('code')->toString();
        $password = $request->string('password')->toString();

        $user = User::query()->where('email', $email)->first();

        if (! $user || ! $this->otp->verify($user, $code)) {
            throw ValidationException::withMessages([
                'code' => ['Invalid or expired reset code.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['This account has been deactivated.'],
            ]);
        }

        $user->forceFill([
            'password' => $password,
            'verification_code' => null,
            'code_expires_at' => null,
        ])->save();

        // Revoke Sanctum API tokens if the table exists (SPA cookie sessions are unaffected).
        try {
            if (method_exists($user, 'tokens')) {
                $user->tokens()->delete();
            }
        } catch (Throwable $e) {
            Log::warning('Password reset: could not revoke personal access tokens.', [
                'user_id' => $user->id,
                'message' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully. You can now log in.',
        ]);
    }
}
