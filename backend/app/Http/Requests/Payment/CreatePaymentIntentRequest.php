<?php

namespace App\Http\Requests\Payment;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreatePaymentIntentRequest extends FormRequest
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
            'course_id' => [
                'required',
                'integer',
                'min:1',
                Rule::exists('courses', 'id')->whereNull('deleted_at'),
            ],
            'mode' => ['nullable', 'string', Rule::in(['live', 'recorded', 'simulator'])],
            'email' => ['required', 'string', 'email', 'max:255'],
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'phone' => ['required', 'string', 'max:20', 'regex:/^\+[1-9]\d{6,14}$/'],
            'anonymous_id' => ['nullable', 'string', 'max:64'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'course_id.required' => 'A course is required to start checkout.',
            'course_id.exists' => 'The selected course is not available.',
            'email.required' => 'An email address is required.',
            'name.required' => 'Your full name is required.',
            'phone.required' => 'A phone number is required.',
            'phone.regex' => 'Enter a valid international phone number.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('email')) {
            $this->merge([
                'email' => mb_strtolower(trim((string) $this->input('email'))),
            ]);
        }

        if ($this->has('name')) {
            $this->merge([
                'name' => trim(preg_replace('/\s+/u', ' ', (string) $this->input('name')) ?? ''),
            ]);
        }

        if ($this->has('phone')) {
            $this->merge([
                'phone' => trim((string) $this->input('phone')),
            ]);
        }
    }
}
