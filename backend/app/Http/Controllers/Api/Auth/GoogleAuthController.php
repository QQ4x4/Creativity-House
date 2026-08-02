<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class GoogleAuthController extends Controller
{
    public function redirect(): RedirectResponse|Response
    {
        if (blank(config('services.google.client_id')) || blank(config('services.google.client_secret'))) {
            return redirect()->away($this->frontendUrl('/login').'?error=google_not_configured');
        }

        return Socialite::driver('google')
            ->stateless()
            ->redirect();
    }

    public function callback(): RedirectResponse
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (Throwable) {
            return redirect()->away($this->frontendUrl('/login').'?error=google_auth_failed');
        }

        $email = mb_strtolower((string) $googleUser->getEmail());
        $googleId = (string) $googleUser->getId();

        if ($email === '' || mb_strlen($email) > 50) {
            return redirect()->away($this->frontendUrl('/login').'?error=invalid_google_email');
        }

        $name = trim((string) ($googleUser->getName() ?: 'Google User'));
        $parts = preg_split('/\s+/', $name, 2) ?: [];
        $firstName = mb_substr($parts[0] ?? 'Google', 0, 50);
        $lastName = mb_substr($parts[1] ?? 'User', 0, 50);

        $user = DB::transaction(function () use ($email, $googleId, $firstName, $lastName, $name) {
            $existingByGoogle = User::query()->where('google_id', $googleId)->first();
            if ($existingByGoogle) {
                return $existingByGoogle;
            }

            $existingByEmail = User::query()->where('email', $email)->first();
            if ($existingByEmail) {
                if (! $existingByEmail->is_active) {
                    return null;
                }

                $existingByEmail->forceFill([
                    'google_id' => $googleId,
                    'email_verified_at' => $existingByEmail->email_verified_at ?? now(),
                    'verification_code' => null,
                    'code_expires_at' => null,
                ])->save();

                return $existingByEmail;
            }

            return User::query()->create([
                'first_name' => $firstName,
                'last_name' => $lastName,
                'name' => mb_substr($name !== '' ? $name : "{$firstName} {$lastName}", 0, 100),
                'email' => $email,
                'google_id' => $googleId,
                'password' => null,
                'is_active' => true,
                'email_verified_at' => now(),
            ]);
        });

        if (! $user) {
            return redirect()->away($this->frontendUrl('/login').'?error=account_deactivated');
        }

        Auth::login($user, true);
        request()->session()->regenerate();

        return redirect()->away($this->frontendUrl('/').'?auth=success');
    }

    private function frontendUrl(string $path = '/'): string
    {
        $base = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
        $path = '/'.ltrim($path, '/');

        // Default locale path; frontend middleware will normalize if needed.
        if ($path === '/') {
            return $base.'/en';
        }

        if (Str::startsWith($path, ['/en', '/ar'])) {
            return $base.$path;
        }

        return $base.'/en'.$path;
    }
}
