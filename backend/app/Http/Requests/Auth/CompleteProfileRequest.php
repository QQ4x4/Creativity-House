<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Concerns\SanitizesAuthInput;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Phone-only profile completion for Google OAuth users.
 */
class CompleteProfileRequest extends FormRequest
{
    use SanitizesAuthInput;

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $this->sanitizeFields(['phone_number']);

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
        return [
            'phone_number' => ['required', 'string', 'max:50', 'regex:/^\+[1-9]\d{6,14}$/'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'phone_number.required' => 'Phone number is required.',
            'phone_number.regex' => 'Phone number must be a valid international format (e.g. +9677xxxxxxx).',
        ];
    }
}
