<?php

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNotificationPreferencesRequest extends FormRequest
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
            'course_updates' => ['required', 'boolean'],
            'new_certificates' => ['required', 'boolean'],
            'promotional_announcements' => ['required', 'boolean'],
        ];
    }

    /**
     * Only the three known keys, cast to real booleans — arbitrary JSON can never
     * reach the column.
     *
     * @return array<string, bool>
     */
    public function preferences(): array
    {
        $validated = $this->validated();

        return [
            'course_updates' => (bool) $validated['course_updates'],
            'new_certificates' => (bool) $validated['new_certificates'],
            'promotional_announcements' => (bool) $validated['promotional_announcements'],
        ];
    }
}
