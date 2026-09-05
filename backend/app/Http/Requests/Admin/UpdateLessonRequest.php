<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLessonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $courseId = $this->route('course')?->id;

        return [
            'title' => ['sometimes', 'required', 'string', 'max:200'],
            'video_url' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'bunny_video_id' => ['sometimes', 'nullable', 'string', 'max:64'],
            'bunny_library_id' => ['sometimes', 'nullable', 'string', 'max:32'],
            'duration' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:86400'],
            'is_locked' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'pdf_resource_urls' => ['sometimes', 'nullable', 'array'],
            'pdf_resource_urls.*' => ['nullable'],
            'resources' => ['sometimes', 'nullable', 'array', 'max:50'],
            'resources.*.id' => ['nullable', 'integer'],
            'resources.*.title' => ['required_with:resources', 'string', 'max:200'],
            'resources.*.type' => ['nullable', 'string', 'in:file,link'],
            'resources.*.url' => ['required_with:resources', 'string', 'max:2048'],
            'resources.*.file_path' => ['nullable', 'string', 'max:2048'],
            'resources.*.file_size' => ['nullable', 'string', 'max:40'],
            'resources.*.size_bytes' => ['nullable', 'integer', 'min:0'],

            // Moving a lesson between modules — the target must belong to the
            // same course, otherwise curriculum could leak across courses.
            'module_id' => [
                'sometimes',
                'required',
                'integer',
                Rule::exists('modules', 'id')->where('course_id', $courseId)->whereNull('deleted_at'),
            ],
        ];
    }
}
