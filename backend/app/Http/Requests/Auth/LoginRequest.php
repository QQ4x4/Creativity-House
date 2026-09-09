<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Concerns\SanitizesAuthInput;
use App\Services\RecaptchaService;
use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    use SanitizesAuthInput;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->sanitizeFields(['email', 'password', 'recaptcha_token']);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $recaptchaRequired = app(RecaptchaService::class)->shouldEnforce()
            && filled(config('services.recaptcha.secret'));

        return [
            'email' => ['required', 'string', 'email:filter', 'max:'.config('field_limits.email')],
            'password' => ['required', 'string', 'max:'.config('field_limits.password')],
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
            'recaptcha_token.required' => 'reCAPTCHA verification is required.',
        ];
    }
}
