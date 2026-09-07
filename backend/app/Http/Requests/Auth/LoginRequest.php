<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Concerns\SanitizesAuthInput;
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
        $recaptchaRequired = filled(config('services.recaptcha.secret'));

        return [
            'email' => ['required', 'string', 'email:filter', 'max:50'],
            'password' => ['required', 'string', 'max:50'],
            'recaptcha_token' => $recaptchaRequired
                ? ['required', 'string', 'max:2000']
                : ['nullable', 'string', 'max:2000'],
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
