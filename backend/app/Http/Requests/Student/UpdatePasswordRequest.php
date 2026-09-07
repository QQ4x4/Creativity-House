<?php

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class UpdatePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // `current_password` verifies against the authenticated user's hash.
            'current_password' => ['required', 'string', 'max:'.config('field_limits.password'), 'current_password:web'],
            'password' => [
                'required',
                'string',
                'max:'.config('field_limits.password'),
                'confirmed',
                'different:current_password',
                Password::min(8)
                    ->max((int) config('field_limits.password'))
                    ->mixedCase()
                    ->numbers()
                    ->symbols(),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'current_password.current_password' => 'Your current password is incorrect.',
            'password.confirmed' => 'Password confirmation does not match.',
            'password.different' => 'New password must be different from your current password.',
        ];
    }
}
