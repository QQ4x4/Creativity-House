<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResendOtpRequest;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Models\User;
use App\Services\OtpService;
use App\Services\RecaptchaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

class AuthController extends Controller
{
    public function __construct(
        private readonly RecaptchaService $recaptcha,
        private readonly OtpService $otp,
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $recaptchaToken = $request->input('recaptcha_token');

        // Skip verify when local secret is empty (matches nullable RegisterRequest rule).
        if (filled(config('services.recaptcha.secret'))) {
            if (! $this->recaptcha->verify(
                is_string($recaptchaToken) ? $recaptchaToken : null,
                $request->ip()
            )) {
                throw ValidationException::withMessages([
                    'recaptcha_token' => ['reCAPTCHA verification failed. Please try again.'],
                ]);
            }
        }

        $data = $request->safe()->only([
            'first_name',
            'last_name',
            'email',
            'phone_number',
            'password',
        ]);

        try {
            $user = DB::transaction(function () use ($data) {
                return User::query()->create([
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    'name' => trim($data['first_name'].' '.$data['last_name']),
                    'email' => mb_strtolower($data['email']),
                    'phone_number' => $data['phone_number'],
                    'password' => $data['password'],
                    'is_active' => true,
                    'email_verified_at' => null,
                ]);
            });
        } catch (Throwable $e) {
            Log::error('Registration failed: '.$e->getMessage(), [
                'email' => $data['email'] ?? null,
                'phone_number' => $data['phone_number'] ?? null,
                'exception' => $e::class,
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw ValidationException::withMessages([
                'email' => ['Unable to create account: '.$e->getMessage()],
            ]);
        }

        $emailSent = true;

        try {
            $this->otp->issue($user);
        } catch (Throwable $e) {
            // Account is saved; OTP hash is stored — surface a clear mail failure.
            $emailSent = false;
            Log::error('Registration succeeded but OTP email failed.', [
                'user_id' => $user->id,
                'email' => $user->email,
                'message' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => $emailSent
                ? 'Registration successful. Please verify the code sent to your email.'
                : 'Account created, but the verification email could not be sent. Please use Resend code.',
            'email' => $user->email,
            'requires_verification' => true,
            'email_sent' => $emailSent,
        ], 201);
    }

    public function verifyOtp(VerifyOtpRequest $request): JsonResponse
    {
        $email = mb_strtolower($request->string('email')->toString());
        $code = $request->string('code')->toString();

        $user = User::query()->where('email', $email)->first();

        if (! $user || ! $this->otp->verify($user, $code)) {
            throw ValidationException::withMessages([
                'code' => ['Invalid or expired verification code.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['This account has been deactivated.'],
            ]);
        }

        $user->markEmailAsVerified();

        Auth::login($user, true);
        $request->session()->regenerate();

        return response()->json([
            'success' => true,
            'message' => 'Email verified successfully.',
            'user' => $this->userPayload($user),
        ]);
    }

    public function resendOtp(ResendOtpRequest $request): JsonResponse
    {
        $email = mb_strtolower($request->string('email')->toString());
        $user = User::query()->where('email', $email)->first();

        // Always return a generic success to avoid account enumeration.
        if ($user && ! $user->hasVerifiedEmail() && $user->is_active) {
            $this->otp->issue($user);
        }

        return response()->json([
            'success' => true,
            'message' => 'If an unverified account exists for this email, a new code has been sent.',
        ]);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $email = mb_strtolower($request->string('email')->toString());
        $password = $request->string('password')->toString();

        $user = User::query()->where('email', $email)->first();

        if (! $user || blank($user->password) || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['This account has been deactivated.'],
            ]);
        }

        if (! $user->hasVerifiedEmail()) {
            $emailSent = true;

            try {
                // Regenerate OTP + dispatch verification email (was missing — frontend
                // navigated to OTP screen but Resend never received a request).
                $this->otp->issue($user);
            } catch (Throwable $e) {
                $emailSent = false;
                Log::error('Login blocked for unverified user; OTP email failed.', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'message' => $e->getMessage(),
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => $emailSent
                    ? 'Please verify your email before logging in. A new code has been sent.'
                    : 'Please verify your email before logging in. We could not send the code — use Resend code.',
                'requires_verification' => true,
                'email' => $user->email,
                'email_sent' => $emailSent,
            ], 403);
        }

        Auth::login($user, true);
        $request->session()->regenerate();

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'user' => $this->userPayload($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'user' => $this->userPayload($request->user()),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'name' => $user->full_name,
            'email' => $user->email,
            'phone_number' => $user->phone_number,
            // Public URL so the Header avatar stays in sync after refresh.
            'avatar_url' => $user->avatarUrl(),
            'email_verified_at' => $user->email_verified_at,
            'is_active' => $user->is_active,
        ];
    }
}
