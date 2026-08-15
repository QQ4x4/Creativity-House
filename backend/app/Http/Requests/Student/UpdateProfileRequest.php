<?php

namespace App\Http\Requests\Student;

use App\Http\Requests\Concerns\SanitizesAuthInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    use SanitizesAuthInput;

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $this->sanitizeFields([
            'first_name',
            'last_name',
            'email',
            'phone_number',
        ]);

        // Normalize to compact E.164 (keep leading +, strip spaces/dashes/parens)
        // to match RegisterRequest so both write identical values.
        if ($this->filled('phone_number') && is_string($this->input('phone_number'))) {
            $phone = preg_replace('/[^\d+]/', '', $this->input('phone_number'));

            if (is_string($phone) && str_starts_with($phone, '+')) {
                $this->merge(['phone_number' => $phone]);
            }
        }

        if ($this->filled('email') && is_string($this->input('email'))) {
            $this->merge(['email' => mb_strtolower($this->input('email'))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $userId = $this->user()?->id;

        return [
            'first_name' => ['required', 'string', 'max:50', 'regex:/^[\p{L}\s\'\-]+$/u'],
            'last_name' => ['required', 'string', 'max:50', 'regex:/^[\p{L}\s\'\-]+$/u'],
            'email' => [
                'required',
                'string',
                'email:filter',
                'max:50',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            // E.164: leading + required, 7–15 digits total.
            'phone_number' => ['required', 'string', 'max:50', 'regex:/^\+[1-9]\d{6,14}$/'],

            // Optional inline avatar so a single multipart PUT can update everything.
            // The dedicated POST /profile/avatar endpoint uses UpdateAvatarRequest.
            'avatar' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
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
            'email.unique' => 'This email is already in use by another account.',
            'phone_number.required' => 'Phone number is required.',
            'phone_number.regex' => 'Phone number must be a valid international format (e.g. +9677xxxxxxx).',
            'avatar.mimes' => 'Avatar must be a JPG, PNG, or WebP image.',
            'avatar.max' => 'Avatar must not be larger than 2 MB.',
        ];
    }
}
