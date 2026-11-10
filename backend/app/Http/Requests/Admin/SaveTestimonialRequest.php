<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveTestimonialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    protected function prepareForValidation(): void
    {
        foreach ([
            'bunny_collection_id',
            'video_title',
            'person_name_en',
            'person_name_ar',
            'person_role_en',
            'person_role_ar',
            'country',
            'course_id',
            'caption_en',
            'caption_ar',
            'quote_en',
            'quote_ar',
            'custom_thumbnail_path',
        ] as $key) {
            if ($this->input($key) === '') {
                $this->merge([$key => null]);
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $medium = config('field_limits.medium');
        $isUpdate = $this->isMethod('PUT') || $this->isMethod('PATCH');

        return [
            'bunny_video_id' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:64'],
            'bunny_collection_id' => ['nullable', 'string', 'max:64'],
            'video_title' => ['nullable', 'string', 'max:'.$medium],
            'duration_seconds' => ['nullable', 'integer', 'min:0', 'max:86400'],
            'orientation' => ['nullable', Rule::in(['landscape', 'portrait'])],
            'person_name_en' => ['nullable', 'string', 'max:'.$medium],
            'person_name_ar' => ['nullable', 'string', 'max:'.$medium],
            'person_role_en' => ['nullable', 'string', 'max:'.$medium],
            'person_role_ar' => ['nullable', 'string', 'max:'.$medium],
            'country' => ['nullable', 'string', 'max:120'],
            'course_id' => ['nullable', 'integer', 'exists:courses,id'],
            'caption_en' => ['nullable', 'string', 'max:'.$medium],
            'caption_ar' => ['nullable', 'string', 'max:'.$medium],
            'quote_en' => ['nullable', 'string', 'max:2000'],
            'quote_ar' => ['nullable', 'string', 'max:2000'],
            'custom_thumbnail_path' => ['nullable', 'string', 'max:500'],
            'is_featured' => ['sometimes', 'boolean'],
            'is_published' => ['sometimes', 'boolean'],
            'position' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
