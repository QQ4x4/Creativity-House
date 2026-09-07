<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Concerns\SanitizesAuthInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ResetPasswordRequest extends FormRequest
{
    use SanitizesAuthInput;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->sanitizeFields([
            'email',
            'code',
            'password',
            'password_confirmation',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email:filter', 'max:'.config('field_limits.email')],
            'code' => ['required', 'string', 'digits:6', 'max:'.config('field_limits.otp')],
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
        ];
    }
}
