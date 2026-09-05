<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Whole-tree curriculum save. The editor keeps modules/lessons in local React
 * state and submits once, so the server diffs against what it already has
 * rather than receiving a stream of granular writes.
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
        return [
            'modules' => ['present', 'array', 'max:200'],

            // `id` absent ⇒ create. Present ⇒ update that row (ownership is
            // verified in the service, not here, so a forged id 404s).
            'modules.*.id' => ['nullable', 'integer'],
            'modules.*.title_en' => ['required', 'string', 'max:200'],
            'modules.*.title_ar' => ['nullable', 'string', 'max:200'],
            'modules.*.duration_label_en' => ['nullable', 'string', 'max:80'],
            'modules.*.duration_label_ar' => ['nullable', 'string', 'max:80'],

            'modules.*.lessons' => ['present', 'array', 'max:500'],
            'modules.*.lessons.*.id' => ['nullable', 'integer'],
            'modules.*.lessons.*.title' => ['required', 'string', 'max:200'],
            'modules.*.lessons.*.video_url' => ['nullable', 'string', 'max:2048'],
            'modules.*.lessons.*.bunny_video_id' => ['nullable', 'string', 'max:64'],
            'modules.*.lessons.*.bunny_library_id' => ['nullable', 'string', 'max:32'],
            'modules.*.lessons.*.duration' => ['nullable', 'integer', 'min:0', 'max:86400'],
            'modules.*.lessons.*.is_locked' => ['nullable', 'boolean'],
            'modules.*.lessons.*.pdf_resource_urls' => ['nullable', 'array'],
            'modules.*.lessons.*.pdf_resource_urls.*' => ['nullable'],
            'modules.*.lessons.*.resources' => ['nullable', 'array', 'max:50'],
            'modules.*.lessons.*.resources.*.id' => ['nullable', 'integer'],
            'modules.*.lessons.*.resources.*.title' => ['required_with:modules.*.lessons.*.resources', 'string', 'max:200'],
            'modules.*.lessons.*.resources.*.type' => ['nullable', 'string', 'in:file,link'],
            'modules.*.lessons.*.resources.*.url' => ['required_with:modules.*.lessons.*.resources', 'string', 'max:2048'],
            'modules.*.lessons.*.resources.*.file_path' => ['nullable', 'string', 'max:2048'],
            'modules.*.lessons.*.resources.*.file_size' => ['nullable', 'string', 'max:40'],
            'modules.*.lessons.*.resources.*.size_bytes' => ['nullable', 'integer', 'min:0'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'modules.*.title_en.required' => 'Every module needs an English title.',
            'modules.*.lessons.*.title.required' => 'Every lesson needs a title.',
        ];
    }
}
