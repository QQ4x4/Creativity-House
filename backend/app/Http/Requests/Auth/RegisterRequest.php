<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Concerns\SanitizesAuthInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    use SanitizesAuthInput;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->sanitizeFields([
            'first_name',
            'last_name',
            'email',
            'phone_number',
            'password',
            'password_confirmation',
            'recaptcha_token',
        ]);

        // Normalize phone to compact E.164 (keep leading +, strip spaces/dashes).
        if ($this->filled('phone_number') && is_string($this->input('phone_number'))) {
            $phone = preg_replace('/[^\d+]/', '', $this->input('phone_number'));
            if (is_string($phone) && str_starts_with($phone, '+')) {
                $this->merge(['phone_number' => $phone]);
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $recaptchaRequired = filled(config('services.recaptcha.secret'));

        return [
            'first_name' => ['required', 'string', 'max:'.config('field_limits.name'), 'regex:/^[\p{L}\s\'\-]+$/u'],
            'last_name' => ['required', 'string', 'max:'.config('field_limits.name'), 'regex:/^[\p{L}\s\'\-]+$/u'],
            'email' => ['required', 'string', 'email:filter', 'max:'.config('field_limits.email'), 'unique:users,email'],
            // E.164: leading + required, 7–15 digits total after country indicator.
            'phone_number' => ['required', 'string', 'max:'.config('field_limits.phone'), 'regex:/^\+[1-9]\d{6,14}$/'],
            'password' => [
                'required',
                'string',
                'max:'.config('field_limits.password'),
                'confirmed',
                Password::min(8)
                    ->max((int) config('field_limits.password'))
                    ->mixedCase()
                    ->numbers()
                    ->symbols(),
            ],
            'recaptcha_token' => $recaptchaRequired
                ? ['required', 'string', 'max:'.config('field_limits.recaptcha')]
                : ['nullable', 'string', 'max:'.config('field_limits.recaptcha')],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'first_name.regex' => 'First name may only contain letters, spaces, hyphens, and apostrophes.',
            'last_name.regex' => 'Last name may only contain letters, spaces, hyphens, and apostrophes.',
            'email.unique' => 'This email is already registered.',
            'phone_number.required' => 'Phone number is required.',
            'phone_number.regex' => 'Phone number must be a valid international format (e.g. +9677xxxxxxx).',
            'password.confirmed' => 'Password confirmation does not match.',
            'recaptcha_token.required' => 'reCAPTCHA verification is required.',
        ];
    }
}
