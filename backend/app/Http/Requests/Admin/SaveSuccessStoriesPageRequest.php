<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class SaveSuccessStoriesPageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    protected function prepareForValidation(): void
    {
        foreach ([
            'hero_title_en',
            'hero_title_ar',
            'hero_subtitle_en',
            'hero_subtitle_ar',
            'cta_title_en',
            'cta_title_ar',
            'cta_button_en',
            'cta_button_ar',
            'cta_link',
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

        return [
            'hero_title_en' => ['nullable', 'string', 'max:'.$medium],
            'hero_title_ar' => ['nullable', 'string', 'max:'.$medium],
            'hero_subtitle_en' => ['nullable', 'string', 'max:2000'],
            'hero_subtitle_ar' => ['nullable', 'string', 'max:2000'],
            'cta_title_en' => ['nullable', 'string', 'max:'.$medium],
            'cta_title_ar' => ['nullable', 'string', 'max:'.$medium],
            'cta_button_en' => ['nullable', 'string', 'max:120'],
            'cta_button_ar' => ['nullable', 'string', 'max:120'],
            'cta_link' => ['nullable', 'string', 'max:500'],
        ];
    }
}
