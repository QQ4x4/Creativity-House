<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreLessonRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:'.config('field_limits.medium')],
            'video_url' => ['nullable', 'string', 'max:'.config('field_limits.url')],
            // Bunny GUIDs are UUIDs, but the column is a plain string so an
            // operator can paste a legacy id without the API rejecting it.
            'bunny_video_id' => ['nullable', 'string', 'max:'.config('field_limits.short')],
            'bunny_library_id' => ['nullable', 'string', 'max:'.config('field_limits.short')],
            'duration' => ['nullable', 'integer', 'min:0', 'max:86400'],
            'is_locked' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
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
    }
}
