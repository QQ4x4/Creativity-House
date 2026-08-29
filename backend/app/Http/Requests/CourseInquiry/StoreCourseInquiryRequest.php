<?php

namespace App\Http\Requests\CourseInquiry;

use App\Http\Requests\Concerns\SanitizesAuthInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCourseInquiryRequest extends FormRequest
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
            'email',
            'phone',
            'phone_number',
            'message',
        ]);

        $phone = $this->input('phone');
        if (is_string($phone)) {
            $digits = preg_replace('/[^\d+]/', '', $phone) ?? '';
            $this->merge(['phone' => ($digits === '' || $digits === '+') ? null : $digits]);
        } elseif ($phone === '' || $phone === null) {
            $this->merge(['phone' => null]);
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
            'email' => ['required', 'string', 'email:filter', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255', 'regex:/^\+[1-9]\d{6,14}$/'],
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
            'message.min' => 'Please describe your question in at least 20 characters.',
        ];
    }
}
