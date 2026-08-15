<?php

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Dedicated multipart upload for POST /profile/avatar (what the Next.js client
 * calls). Same rules as the inline `avatar` field, but required.
 */
class UpdateAvatarRequest extends FormRequest
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
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'avatar.required' => 'Please choose an image to upload.',
            'avatar.image' => 'The uploaded file must be an image.',
            'avatar.mimes' => 'Avatar must be a JPG, PNG, or WebP image.',
            'avatar.max' => 'Avatar must not be larger than 2 MB.',
        ];
    }
}
