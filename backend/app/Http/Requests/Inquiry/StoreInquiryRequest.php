<?php

namespace App\Http\Requests\Inquiry;

use App\Http\Requests\Concerns\SanitizesAuthInput;
use App\Models\Course;
use App\Models\Inquiry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInquiryRequest extends FormRequest
{
    use SanitizesAuthInput;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // Accept legacy form field names from the public Next.js clients.
        if ($this->filled('name') && ! $this->filled('full_name')) {
            $this->merge(['full_name' => $this->input('name')]);
        }

        if ($this->filled('phone') && ! $this->filled('phone_number')) {
            $this->merge(['phone_number' => $this->input('phone')]);
        }

        $this->sanitizeFields([
            'type',
            'full_name',
            'name',
            'email',
            'phone',
            'phone_number',
            'company_name',
            'target_course',
            'message',
        ]);

        $phone = $this->input('phone_number');
        if (is_string($phone)) {
            $digits = preg_replace('/[^\d+]/', '', $phone) ?? '';
            $this->merge(['phone_number' => ($digits === '' || $digits === '+') ? null : $digits]);
        } elseif ($phone === '' || $phone === null) {
            $this->merge(['phone_number' => null]);
        }

        if ($this->filled('email') && is_string($this->input('email'))) {
            $this->merge(['email' => mb_strtolower($this->input('email'))]);
        }

        $courseId = $this->input('course_id');
        if ($courseId === '' || $courseId === 'null' || $courseId === null) {
            $this->merge(['course_id' => null]);
        }

        // Resolve a human-readable target course label when only course_id is sent.
        if (! $this->filled('target_course') && $this->filled('course_id')) {
            $course = Course::query()
                ->whereKey((int) $this->input('course_id'))
                ->whereNull('deleted_at')
                ->first();

            if ($course) {
                $title = $course->title_en
                    ?? $course->title
                    ?? $course->slug
                    ?? null;
                if (is_string($title) && $title !== '') {
                    $this->merge(['target_course' => $title]);
                }
            }
        }

        if ($this->input('company_name') === '') {
            $this->merge(['company_name' => null]);
        }

        if ($this->input('target_course') === '') {
            $this->merge(['target_course' => null]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $isOrganization = $this->input('type') === Inquiry::TYPE_ORGANIZATION;

        return [
            'type' => ['required', 'string', Rule::in([Inquiry::TYPE_USER, Inquiry::TYPE_ORGANIZATION])],
            'full_name' => ['required', 'string', 'max:'.config('field_limits.name'), 'regex:/^[\p{L}\s\'\-]+$/u'],
            'email' => ['required', 'string', 'email:filter', 'max:'.config('field_limits.email')],
            'phone_number' => [
                $isOrganization ? 'required' : 'nullable',
                'string',
                'max:'.config('field_limits.phone'),
                'regex:/^\+[1-9]\d{6,14}$/',
            ],
            'company_name' => [
                $isOrganization ? 'required' : 'nullable',
                'string',
                'max:'.config('field_limits.medium'),
            ],
            'target_course' => ['nullable', 'string', 'max:'.config('field_limits.medium')],
            'course_id' => ['nullable', 'integer', Rule::exists('courses', 'id')->whereNull('deleted_at')],
            'message' => ['required', 'string', 'min:20', 'max:'.config('field_limits.long')],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'full_name.regex' => 'Full name may only contain letters, spaces, hyphens, and apostrophes.',
            'phone_number.regex' => 'Phone number must be a valid international format (e.g. +60178918602).',
            'course_id.exists' => 'The selected course is not available.',
            'message.min' => 'Please write at least 20 characters.',
        ];
    }
}
