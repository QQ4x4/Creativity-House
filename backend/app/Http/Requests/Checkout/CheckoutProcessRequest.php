<?php

namespace App\Http\Requests\Checkout;

use App\Http\Requests\Concerns\SanitizesAuthInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CheckoutProcessRequest extends FormRequest
{
    use SanitizesAuthInput;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('phone') && ! $this->filled('phone_number')) {
            $this->merge(['phone_number' => $this->input('phone')]);
        }

        if ($this->filled('course') && ! $this->filled('course_slug')) {
            $this->merge(['course_slug' => $this->input('course')]);
        }

        $this->sanitizeFields([
            'first_name',
            'last_name',
            'email',
            'phone',
            'phone_number',
            'country',
            'course_slug',
            'mode',
        ]);

        if ($this->filled('phone_number') && is_string($this->input('phone_number'))) {
            $phone = preg_replace('/[^\d+]/', '', $this->input('phone_number'));
            if (is_string($phone) && str_starts_with($phone, '+')) {
                $this->merge(['phone_number' => $phone]);
            }
        }

        if ($this->filled('email') && is_string($this->input('email'))) {
            $this->merge(['email' => mb_strtolower($this->input('email'))]);
        }

        if ($this->filled('country') && is_string($this->input('country'))) {
            $this->merge(['country' => strtoupper($this->input('country'))]);
        }

        $payload = $this->all();
        unset(
            $payload['card_number'],
            $payload['expiry'],
            $payload['cvc'],
            $payload['card_expiry'],
            $payload['card_cvc']
        );
        $this->replace($payload);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:50', 'regex:/^[\p{L}\s\'\-]+$/u'],
            'last_name' => ['required', 'string', 'max:50', 'regex:/^[\p{L}\s\'\-]+$/u'],
            'email' => ['required', 'string', 'email:filter', 'max:50'],
            'phone_number' => ['required', 'string', 'max:50', 'regex:/^\+[1-9]\d{6,14}$/'],
            'country' => ['required', 'string', 'size:2', 'regex:/^[A-Z]{2}$/'],
            'course_id' => ['required_without:course_slug', 'nullable', 'integer', 'exists:courses,id'],
            'course_slug' => ['required_without:course_id', 'nullable', 'string', 'max:191', 'exists:courses,slug'],
            'mode' => ['nullable', 'string', 'max:32', Rule::in(['live', 'recorded', 'simulator'])],
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
            'phone_number.regex' => 'Phone number must be a valid international format (e.g. +9677xxxxxxx).',
            'course_id.exists' => 'The selected course is not available.',
            'course_slug.exists' => 'The selected course is not available.',
            'country.regex' => 'Select a valid country.',
        ];
    }
}
