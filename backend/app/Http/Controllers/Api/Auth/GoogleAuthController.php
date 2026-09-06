<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use GuzzleHttp\Client as GuzzleClient;
use Laravel\Socialite\Contracts\Provider as SocialiteProvider;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Google OAuth for the Next.js SPA.
 *
 * Railway and Vercel sit on different registrable domains, so a session cookie
 * set on the Google callback (Railway) is never sent to Vercel. After Socialite
 * succeeds we mint a one-time handoff code; the frontend exchanges it via the
 * same-origin `/api` proxy so Sanctum can issue a first-party session cookie.
 */
class GoogleAuthController extends Controller
{
    private const HANDOFF_TTL_SECONDS = 120;

    private const HANDOFF_PREFIX = 'google_oauth_handoff:';

    public function redirect(): RedirectResponse|Response
    {
        if (blank(config('services.google.client_id')) || blank(config('services.google.client_secret'))) {
            return redirect()->away($this->frontendUrl('/login').'?error=google_not_configured');
        }

        return $this->googleDriver()->redirect();
    }

    public function callback(): RedirectResponse
    {
        try {
            $googleUser = $this->googleDriver()->user();
        } catch (Throwable $exception) {
            Log::warning('Google OAuth: Socialite callback failed.', [
                'message' => $exception->getMessage(),
            ]);

            return redirect()->away($this->frontendUrl('/login').'?error=google_auth_failed');
        }

        $email = mb_strtolower((string) $googleUser->getEmail());
        $googleId = (string) $googleUser->getId();
        // Never persist Google avatar URLs — Next.js blocks them and the UI
        // falls back to the user's initial letter when avatar_url is null.

        if ($email === '' || mb_strlen($email) > 50) {
            return redirect()->away($this->frontendUrl('/login').'?error=invalid_google_email');
        }

        $name = trim((string) ($googleUser->getName() ?: 'Google User'));
        $parts = preg_split('/\s+/', $name, 2) ?: [];
        $firstName = mb_substr($parts[0] ?? 'Google', 0, 50);
        $lastName = mb_substr($parts[1] ?? 'User', 0, 50);

        try {
            $user = DB::transaction(function () use ($email, $googleId, $firstName, $lastName, $name) {
                $existingByGoogle = User::query()->where('google_id', $googleId)->first();
                if ($existingByGoogle) {
                    if (! $existingByGoogle->is_active) {
                        return null;
                    }

                    $this->syncGoogleProfile($existingByGoogle);

                    return $existingByGoogle;
                }

                $existingByEmail = User::query()->where('email', $email)->first();
                if ($existingByEmail) {
                    if (! $existingByEmail->is_active) {
                        return null;
                    }

                    $existingByEmail->forceFill([
                        'google_id' => $googleId,
                        // Google never supplies a phone — keep whatever the user already has.
                        'phone_number' => $existingByEmail->phone_number,
                        'email_verified_at' => $existingByEmail->email_verified_at ?? now(),
                        'verification_code' => null,
                        'code_expires_at' => null,
                        // Keep an existing uploaded avatar; never import Google's.
                    ])->save();

                    return $existingByEmail;
                }

                return User::query()->create([
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'name' => mb_substr($name !== '' ? $name : "{$firstName} {$lastName}", 0, 100),
                    'email' => $email,
                    'phone_number' => null,
                    'avatar_url' => null,
                    'google_id' => $googleId,
                    'password' => null,
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]);
            });
        } catch (Throwable $exception) {
            Log::error('Google OAuth: failed to create or link user.', [
                'email' => $email,
                'google_id' => $googleId,
                'message' => $exception->getMessage(),
                'trace' => $exception->getTraceAsString(),
            ]);

            return redirect()->away($this->frontendUrl('/login').'?error=google_auth_failed');
        }

        if (! $user) {
            return redirect()->away($this->frontendUrl('/login').'?error=account_deactivated');
        }

        $code = Str::random(64);
        Cache::put(self::HANDOFF_PREFIX.$code, $user->id, self::HANDOFF_TTL_SECONDS);

        // Local same-site cookies still benefit from a web login; production
        // relies on the handoff exchange below (Vercel ↔ Railway).
        try {
            Auth::login($user, true);
            request()->session()->regenerate();
        } catch (Throwable $exception) {
            Log::warning('Google OAuth: session login on callback failed (handoff still issued).', [
                'user_id' => $user->id,
                'message' => $exception->getMessage(),
            ]);
        }

        return redirect()->away(
            $this->frontendUrl('/').'?auth=success&code='.urlencode($code)
        );
    }

    /**
     * POST /api/auth/google/exchange
     *
     * Consumes the one-time handoff code and establishes the Sanctum SPA
     * session on the request path the browser actually uses (same-origin
     * `/api` rewrite on Vercel, or direct localhost:8000 locally).
     */
    public function exchange(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:64'],
        ]);

        $cacheKey = self::HANDOFF_PREFIX.$validated['code'];
        $userId = Cache::pull($cacheKey);

        if (! $userId) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired Google sign-in code. Please try again.',
            ], 422);
        }

        /** @var User|null $user */
        $user = User::query()->find($userId);

        if (! $user || ! $user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'This account has been deactivated.',
            ], 403);
        }

        Auth::login($user, true);
        $request->session()->regenerate();

        return response()->json([
            'success' => true,
            'message' => 'Google sign-in successful.',
            'user' => $this->userPayload($user),
        ]);
    }

    /**
     * Stateless Google driver. On local WAMP, cURL often lacks a CA bundle
     * (error 60), so TLS verification is skipped only in `local`.
     */
    private function googleDriver(): SocialiteProvider
    {
        $driver = Socialite::driver('google')->stateless();

        if (app()->environment('local')) {
            $driver->setHttpClient(new GuzzleClient([
                'verify' => false,
                'timeout' => 15,
            ]));
        }

        return $driver;
    }

    private function syncGoogleProfile(User $user): void
    {
        $user->forceFill([
            'email_verified_at' => $user->email_verified_at ?? now(),
            'verification_code' => null,
            'code_expires_at' => null,
        ])->save();
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
            'avatar_url' => $user->avatarUrl(),
            'email_verified_at' => $user->email_verified_at,
            'is_active' => (bool) $user->is_active,
            'is_admin' => $user->isAdmin(),
        ];
    }

    private function frontendUrl(string $path = '/'): string
    {
        $base = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
        $path = '/'.ltrim($path, '/');

        if ($path === '/') {
            return $base.'/en';
        }

        if (Str::startsWith($path, ['/en', '/ar'])) {
            return $base.$path;
        }

        return $base.'/en'.$path;
    }
}
