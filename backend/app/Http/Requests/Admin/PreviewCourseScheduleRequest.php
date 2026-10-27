<?php

namespace App\Http\Requests\Admin;

/**
 * Same rule body as a save, but nothing is persisted — the editor uses this to
 * show the admin which dates a rule would generate.
 */
class PreviewCourseScheduleRequest extends SaveCourseScheduleRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return parent::rules() + [
            'limit' => ['nullable', 'integer', 'between:1,100'],
        ];
    }

    public function previewLimit(): int
    {
        return (int) ($this->input('limit') ?: 20);
    }
}
