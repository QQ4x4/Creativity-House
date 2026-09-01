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
            'title' => ['required', 'string', 'max:200'],
            'video_url' => ['nullable', 'string', 'max:2048'],
            // Bunny GUIDs are UUIDs, but the column is a plain string so an
            // operator can paste a legacy id without the API rejecting it.
            'bunny_video_id' => ['nullable', 'string', 'max:64'],
            'bunny_library_id' => ['nullable', 'string', 'max:32'],
            'duration' => ['nullable', 'integer', 'min:0', 'max:86400'],
            'is_locked' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'pdf_resource_urls' => ['nullable', 'array'],
            'pdf_resource_urls.*' => ['string', 'max:2048'],
        ];
    }
}
