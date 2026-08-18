<?php

namespace App\Http\Requests\OrganizationInquiry;

use App\Http\Requests\Concerns\SanitizesAuthInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOrganizationInquiryRequest extends FormRequest
{
    use SanitizesAuthInput;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('phone_number') && ! $this->filled('phone')) {
            $this->merge(['phone' => $this->input('phone_number')]);
        }

        $this->sanitizeFields([
            'name',
            'company_name',
            'email',
            'phone',
            'phone_number',
            'message',
        ]);

        if ($this->filled('phone') && is_string($this->input('phone'))) {
            $phone = preg_replace('/[^\d+]/', '', $this->input('phone'));
            if (is_string($phone) && str_starts_with($phone, '+')) {
                $this->merge(['phone' => $phone]);
            }
        }

        if ($this->filled('email') && is_string($this->input('email'))) {
            $this->merge(['email' => mb_strtolower($this->input('email'))]);
        }

        $courseId = $this->input('course_id');
        if ($courseId === '' || $courseId === 'null' || $courseId === null) {
            $this->merge(['course_id' => null]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'regex:/^[\p{L}\s\'\-]+$/u'],
            'company_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email:filter', 'max:255'],
            'phone' => ['required', 'string', 'max:255', 'regex:/^\+[1-9]\d{6,14}$/'],
            'course_id' => ['nullable', 'integer', Rule::exists('courses', 'id')->whereNull('deleted_at')],
            'message' => ['required', 'string', 'min:20', 'max:5000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.regex' => 'Full name may only contain letters, spaces, hyphens, and apostrophes.',
            'phone.regex' => 'Phone number must be a valid international format (e.g. +9677xxxxxxx).',
            'course_id.exists' => 'The selected course is not available.',
            'message.min' => 'Please describe your requirements in at least 20 characters.',
        ];
    }
}
