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
            'title_en' => ['required', 'string', 'max:'.config('field_limits.medium')],
            'title_ar' => ['nullable', 'string', 'max:'.config('field_limits.medium')],
            'subtitle_en' => ['nullable', 'string', 'max:'.config('field_limits.medium')],
            'subtitle_ar' => ['nullable', 'string', 'max:'.config('field_limits.medium')],
            'slug' => [
                'nullable',
                'string',
                'max:'.config('field_limits.slug'),
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('courses', 'slug')->whereNull('deleted_at'),
            ],
            'badge' => ['nullable', 'string', 'max:'.config('field_limits.short')],
            'badge_ar' => ['nullable', 'string', 'max:'.config('field_limits.short')],
            'category' => ['nullable', Rule::in(self::CATEGORIES)],
            'language_en' => ['nullable', 'string', 'max:'.config('field_limits.short')],
            'language_ar' => ['nullable', 'string', 'max:'.config('field_limits.short')],
            'level' => ['nullable', 'string', 'max:'.config('field_limits.short')],

            'is_published' => ['boolean'],
            'is_public' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],

            'price' => ['required', 'numeric', 'min:0', 'max:999999.99'],
            'original_price' => ['nullable', 'numeric', 'min:0', 'max:999999.99', 'gte:price'],
            'currency' => ['nullable', 'string', 'size:'.config('field_limits.currency')],
            'available_modes' => ['array'],
            'available_modes.*' => [Rule::in(self::MODES)],
            'default_mode' => ['nullable', Rule::in(self::MODES)],

            'catalog_modes' => ['nullable', 'array'],
            'catalog_modes.*.price' => ['nullable', 'numeric', 'min:0'],
            'catalog_modes.*.original_price' => ['nullable', 'numeric', 'min:0'],
            'catalog_modes.*.duration_en' => ['nullable', 'string', 'max:'.config('field_limits.medium')],
            'catalog_modes.*.duration_ar' => ['nullable', 'string', 'max:'.config('field_limits.medium')],
            'catalog_modes.*.features_en' => ['nullable', 'array'],
            'catalog_modes.*.features_en.*' => ['string', 'max:'.config('field_limits.medium')],
            'catalog_modes.*.features_ar' => ['nullable', 'array'],
            'catalog_modes.*.features_ar.*' => ['string', 'max:'.config('field_limits.medium')],

            'pricing_tiers' => ['nullable', 'array'],
            'pricing_tiers.*.mode' => ['required', 'string', Rule::in(self::MODES)],
            'pricing_tiers.*.price' => ['required', 'numeric', 'min:0', 'max:999999.99'],
            'pricing_tiers.*.original_price' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'pricing_tiers.*.duration_hours' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'pricing_tiers.*.badge_text_en' => ['nullable', 'string', 'max:'.config('field_limits.medium')],
            'pricing_tiers.*.badge_text_ar' => ['nullable', 'string', 'max:'.config('field_limits.medium')],
            'pricing_tiers.*.features_en' => ['nullable', 'array'],
            'pricing_tiers.*.features_en.*' => ['string', 'max:'.config('field_limits.medium')],
            'pricing_tiers.*.features_ar' => ['nullable', 'array'],
            'pricing_tiers.*.features_ar.*' => ['string', 'max:'.config('field_limits.medium')],
            'pricing_tiers.*.guarantee_title_en' => ['nullable', 'string', 'max:'.config('field_limits.medium')],
            'pricing_tiers.*.guarantee_title_ar' => ['nullable', 'string', 'max:'.config('field_limits.medium')],
            'pricing_tiers.*.guarantee_text_en' => ['nullable', 'string', 'max:'.config('field_limits.long')],
            'pricing_tiers.*.guarantee_text_ar' => ['nullable', 'string', 'max:'.config('field_limits.long')],

            'description_en' => ['nullable', 'string', 'max:'.config('field_limits.long')],
            'description_ar' => ['nullable', 'string', 'max:'.config('field_limits.long')],
            'schedule_en' => ['nullable', 'string', 'max:'.config('field_limits.long')],
            'schedule_ar' => ['nullable', 'string', 'max:'.config('field_limits.long')],

            'target_audience' => ['array'],
            'target_audience.en' => ['array'],
            'target_audience.en.*' => ['string', 'max:'.config('field_limits.medium')],
            'target_audience.ar' => ['array'],
            'target_audience.ar.*' => ['string', 'max:'.config('field_limits.medium')],

            'learning_outcomes' => ['array'],
            'learning_outcomes.en' => ['array'],
            'learning_outcomes.en.*' => ['string', 'max:'.config('field_limits.medium')],
            'learning_outcomes.ar' => ['array'],
            'learning_outcomes.ar.*' => ['string', 'max:'.config('field_limits.medium')],

            'cover_image' => ['nullable', 'string', 'max:'.config('field_limits.url')],
            'rating' => ['nullable', 'numeric', 'min:0', 'max:5'],
            'students_count' => ['nullable', 'integer', 'min:0'],
            'total_hours' => ['nullable', 'numeric', 'min:0'],
            'duration_label_en' => ['nullable', 'string', 'max:'.config('field_limits.short')],
            'duration_label_ar' => ['nullable', 'string', 'max:'.config('field_limits.short')],
            'last_updated_at' => ['nullable', 'date'],

            'instructor_name' => ['nullable', 'string', 'max:'.config('field_limits.name')],
            'instructor_name_ar' => ['nullable', 'string', 'max:'.config('field_limits.name')],
            'instructor_title_en' => ['nullable', 'string', 'max:'.config('field_limits.medium')],
            'instructor_title_ar' => ['nullable', 'string', 'max:'.config('field_limits.medium')],
            'instructor_bio_en' => ['nullable', 'string', 'max:'.config('field_limits.long')],
            'instructor_bio_ar' => ['nullable', 'string', 'max:'.config('field_limits.long')],
            'instructor_photo' => ['nullable', 'string', 'max:'.config('field_limits.url')],
            'instructor_trained' => ['nullable', 'string', 'max:'.config('field_limits.short')],
            'instructor_countries' => ['nullable', 'integer', 'min:0', 'max:500'],
            'instructor_credentials' => ['array'],
            'instructor_credentials.en' => ['array'],
            'instructor_credentials.en.*' => ['string', 'max:'.config('field_limits.medium')],
            'instructor_credentials.ar' => ['array'],
            'instructor_credentials.ar.*' => ['string', 'max:'.config('field_limits.medium')],

            'seo_title' => ['nullable', 'string', 'max:'.config('field_limits.medium')],
            'seo_description' => ['nullable', 'string', 'max:'.config('field_limits.medium')],
            'seo_keywords' => ['nullable', 'array'],
            'seo_keywords.*' => ['string', 'max:'.config('field_limits.short')],
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
