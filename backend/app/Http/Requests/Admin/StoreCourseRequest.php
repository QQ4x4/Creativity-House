<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Full course create payload — mirrors UpdateCourseRequest but requires the
 * fields needed to insert a row. Slug may be omitted; the controller generates
 * one from title_en when blank.
 */
class StoreCourseRequest extends FormRequest
{
    public const MODES = UpdateCourseRequest::MODES;

    public const CATEGORIES = UpdateCourseRequest::CATEGORIES;

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
            'title_en' => ['required', 'string', 'max:200'],
            'title_ar' => ['nullable', 'string', 'max:200'],
            'subtitle_en' => ['nullable', 'string', 'max:300'],
            'subtitle_ar' => ['nullable', 'string', 'max:300'],
            'slug' => [
                'nullable',
                'string',
                'max:200',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('courses', 'slug')->whereNull('deleted_at'),
            ],
            'badge' => ['nullable', 'string', 'max:80'],
            'badge_ar' => ['nullable', 'string', 'max:80'],
            'category' => ['nullable', Rule::in(self::CATEGORIES)],
            'language_en' => ['nullable', 'string', 'max:80'],
            'language_ar' => ['nullable', 'string', 'max:80'],
            'level' => ['nullable', 'string', 'max:40'],

            'is_published' => ['boolean'],
            'is_public' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],

            'price' => ['required', 'numeric', 'min:0', 'max:999999.99'],
            'original_price' => ['nullable', 'numeric', 'min:0', 'max:999999.99', 'gte:price'],
            'currency' => ['nullable', 'string', 'size:3'],
            'available_modes' => ['array'],
            'available_modes.*' => [Rule::in(self::MODES)],
            'default_mode' => ['nullable', Rule::in(self::MODES)],

            'catalog_modes' => ['nullable', 'array'],
            'catalog_modes.*.price' => ['nullable', 'numeric', 'min:0'],
            'catalog_modes.*.original_price' => ['nullable', 'numeric', 'min:0'],
            'catalog_modes.*.duration_en' => ['nullable', 'string', 'max:120'],
            'catalog_modes.*.duration_ar' => ['nullable', 'string', 'max:120'],
            'catalog_modes.*.features_en' => ['nullable', 'array'],
            'catalog_modes.*.features_en.*' => ['string', 'max:300'],
            'catalog_modes.*.features_ar' => ['nullable', 'array'],
            'catalog_modes.*.features_ar.*' => ['string', 'max:300'],

            'description_en' => ['nullable', 'string', 'max:20000'],
            'description_ar' => ['nullable', 'string', 'max:20000'],
            'schedule_en' => ['nullable', 'string', 'max:20000'],
            'schedule_ar' => ['nullable', 'string', 'max:20000'],

            'target_audience' => ['array'],
            'target_audience.en' => ['array'],
            'target_audience.en.*' => ['string', 'max:300'],
            'target_audience.ar' => ['array'],
            'target_audience.ar.*' => ['string', 'max:300'],

            'learning_outcomes' => ['array'],
            'learning_outcomes.en' => ['array'],
            'learning_outcomes.en.*' => ['string', 'max:300'],
            'learning_outcomes.ar' => ['array'],
            'learning_outcomes.ar.*' => ['string', 'max:300'],

            'cover_image' => ['nullable', 'string', 'max:2048'],
            'rating' => ['nullable', 'numeric', 'min:0', 'max:5'],
            'students_count' => ['nullable', 'integer', 'min:0'],
            'total_hours' => ['nullable', 'numeric', 'min:0'],
            'duration_label_en' => ['nullable', 'string', 'max:80'],
            'duration_label_ar' => ['nullable', 'string', 'max:80'],
            'last_updated_at' => ['nullable', 'date'],

            'instructor_name' => ['nullable', 'string', 'max:150'],
            'instructor_name_ar' => ['nullable', 'string', 'max:150'],
            'instructor_title_en' => ['nullable', 'string', 'max:200'],
            'instructor_title_ar' => ['nullable', 'string', 'max:200'],
            'instructor_bio_en' => ['nullable', 'string', 'max:5000'],
            'instructor_bio_ar' => ['nullable', 'string', 'max:5000'],
            'instructor_photo' => ['nullable', 'string', 'max:2048'],
            'instructor_trained' => ['nullable', 'string', 'max:40'],
            'instructor_countries' => ['nullable', 'integer', 'min:0', 'max:500'],
            'instructor_credentials' => ['array'],
            'instructor_credentials.en' => ['array'],
            'instructor_credentials.en.*' => ['string', 'max:300'],
            'instructor_credentials.ar' => ['array'],
            'instructor_credentials.ar.*' => ['string', 'max:300'],

            'seo_title' => ['nullable', 'string', 'max:200'],
            'seo_description' => ['nullable', 'string', 'max:500'],
            'seo_keywords' => ['nullable', 'array'],
            'seo_keywords.*' => ['string', 'max:80'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'slug.regex' => 'The slug may only contain lowercase letters, numbers and single hyphens.',
            'slug.unique' => 'That slug is already taken.',
            'original_price.gte' => 'The original price must be greater than or equal to the price.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('slug') && trim((string) $this->input('slug')) === '') {
            $this->merge(['slug' => null]);
        }

        $modes = $this->input('available_modes');
        $default = $this->input('default_mode');

        if (is_array($modes) && $modes !== [] && $default !== null && ! in_array($default, $modes, true)) {
            $this->merge(['default_mode' => $modes[0]]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        return $this->validated();
    }
}
