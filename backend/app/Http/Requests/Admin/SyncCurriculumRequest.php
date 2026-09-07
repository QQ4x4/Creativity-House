<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Whole-tree curriculum save. The editor keeps modules / sub-modules / lessons
 * in local React state and submits once, so the server diffs against what it
 * already has rather than receiving a stream of granular writes.
 *
 * Legacy clients may still send `modules.*.lessons` without `sub_modules`;
 * CurriculumService wraps those into a default section.
 */
class SyncCurriculumRequest extends FormRequest
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
        $lessonRules = [
            'id' => ['nullable', 'integer'],
            'title' => ['required', 'string', 'max:'.config('field_limits.medium')],
            'video_url' => ['nullable', 'string', 'max:'.config('field_limits.url')],
            'bunny_video_id' => ['nullable', 'string', 'max:'.config('field_limits.short')],
            'bunny_library_id' => ['nullable', 'string', 'max:'.config('field_limits.short')],
            'duration' => ['nullable', 'integer', 'min:0', 'max:86400'],
            'is_locked' => ['nullable', 'boolean'],
            'pdf_resource_urls' => ['nullable', 'array'],
            'pdf_resource_urls.*' => ['nullable'],
            'resources' => ['nullable', 'array', 'max:50'],
            'resources.*.id' => ['nullable', 'integer'],
            'resources.*.title' => ['required_with:resources', 'string', 'max:'.config('field_limits.medium')],
            'resources.*.type' => ['nullable', 'string', 'in:file,link'],
            'resources.*.url' => ['required_with:resources', 'string', 'max:'.config('field_limits.url')],
            'resources.*.file_path' => ['nullable', 'string', 'max:'.config('field_limits.url')],
            'resources.*.file_size' => ['nullable', 'string', 'max:'.config('field_limits.short')],
            'resources.*.size_bytes' => ['nullable', 'integer', 'min:0'],
        ];

        $prefixed = [];
        foreach ($lessonRules as $key => $rules) {
            $prefixed["modules.*.sub_modules.*.lessons.*.{$key}"] = $rules;
            $prefixed["modules.*.lessons.*.{$key}"] = $rules;
        }

        return array_merge([
            'modules' => ['present', 'array', 'max:200'],

            'modules.*.id' => ['nullable', 'integer'],
            'modules.*.title_en' => ['required', 'string', 'max:'.config('field_limits.medium')],
            'modules.*.title_ar' => ['nullable', 'string', 'max:'.config('field_limits.medium')],
            'modules.*.duration_label_en' => ['nullable', 'string', 'max:'.config('field_limits.short')],
            'modules.*.duration_label_ar' => ['nullable', 'string', 'max:'.config('field_limits.short')],

            // Preferred nest.
            'modules.*.sub_modules' => ['sometimes', 'array', 'max:200'],
            'modules.*.sub_modules.*.id' => ['nullable', 'integer'],
            'modules.*.sub_modules.*.title_en' => ['required', 'string', 'max:'.config('field_limits.medium')],
            'modules.*.sub_modules.*.title_ar' => ['nullable', 'string', 'max:'.config('field_limits.medium')],
            'modules.*.sub_modules.*.lessons' => ['present', 'array', 'max:500'],

            // Legacy flat lessons (normalized server-side into a default section).
            'modules.*.lessons' => ['sometimes', 'array', 'max:500'],
        ], $prefixed);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'modules.*.title_en.required' => 'Every module needs an English title.',
            'modules.*.sub_modules.*.title_en.required_with' => 'Every sub-module needs an English title.',
            'modules.*.sub_modules.*.lessons.*.title.required' => 'Every lesson needs a title.',
            'modules.*.lessons.*.title.required' => 'Every lesson needs a title.',
        ];
    }
}
