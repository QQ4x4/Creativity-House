<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ClaimAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'payment_intent_id' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'size:6', 'regex:/^\d{6}$/'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'payment_intent_id.required' => 'A payment reference is required.',
            'code.required' => 'Enter the 6-digit code from your email.',
            'code.size' => 'The verification code must be 6 digits.',
            'code.regex' => 'The verification code must be 6 digits.',
            'password.confirmed' => 'Password confirmation does not match.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('code')) {
            $this->merge([
                'code' => preg_replace('/\D+/', '', (string) $this->input('code')),
            ]);
        }

        if ($this->has('payment_intent_id')) {
            $this->merge([
                'payment_intent_id' => trim((string) $this->input('payment_intent_id')),
            ]);
        }
    }
}
