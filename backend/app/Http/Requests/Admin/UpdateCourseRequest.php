<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Mirrors the Zod schema in frontend/lib/admin/schema.ts. Every field is
 * `sometimes` so the editor can PATCH a single tab without wiping the rest.
 */
class UpdateCourseRequest extends FormRequest
{
    public const MODES = ['live', 'recorded', 'simulator'];

    public const CATEGORIES = ['live', 'recorded', 'simulators', 'materials'];

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
            /* ─── Basic info ─────────────────────────────────────────────── */
            'title_en' => ['sometimes', 'required', 'string', 'max:'.config('field_limits.medium')],
            'title_ar' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.medium')],
            'subtitle_en' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.medium')],
            'subtitle_ar' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.medium')],
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:'.config('field_limits.slug'),
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('courses', 'slug')->ignore($courseId)->whereNull('deleted_at'),
            ],
            'badge' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.short')],
            'badge_ar' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.short')],
            'category' => ['sometimes', 'nullable', Rule::in(self::CATEGORIES)],
            'language_en' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.short')],
            'language_ar' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.short')],
            'level' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.short')],

            /* ─── Publishing ─────────────────────────────────────────────── */
            'is_published' => ['sometimes', 'boolean'],
            'is_public' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],

            /* ─── Pricing & modes ────────────────────────────────────────── */
            'price' => ['sometimes', 'required', 'numeric', 'min:0', 'max:999999.99'],
            'original_price' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:999999.99', 'gte:price'],
            'currency' => ['sometimes', 'nullable', 'string', 'size:'.config('field_limits.currency')],
            'available_modes' => ['sometimes', 'array'],
            'available_modes.*' => [Rule::in(self::MODES)],
            'default_mode' => ['sometimes', 'nullable', Rule::in(self::MODES)],

            // catalog_modes is a keyed map: { live: { price, original_price, ... } }
            'catalog_modes' => ['sometimes', 'nullable', 'array'],
            'catalog_modes.*.price' => ['nullable', 'numeric', 'min:0'],
            'catalog_modes.*.original_price' => ['nullable', 'numeric', 'min:0'],
            'catalog_modes.*.duration_en' => ['nullable', 'string', 'max:'.config('field_limits.medium')],
            'catalog_modes.*.duration_ar' => ['nullable', 'string', 'max:'.config('field_limits.medium')],
            'catalog_modes.*.features_en' => ['nullable', 'array'],
            'catalog_modes.*.features_en.*' => ['string', 'max:'.config('field_limits.medium')],
            'catalog_modes.*.features_ar' => ['nullable', 'array'],
            'catalog_modes.*.features_ar.*' => ['string', 'max:'.config('field_limits.medium')],

            // Preferred multi-tier pricing (synced to course_pricing_tiers).
            'pricing_tiers' => ['sometimes', 'nullable', 'array'],
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

            /* ─── Marketing ──────────────────────────────────────────────── */
            'description_en' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.long')],
            'description_ar' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.long')],
            'schedule_en' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.long')],
            'schedule_ar' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.long')],

            'target_audience' => ['sometimes', 'array'],
            'target_audience.en' => ['sometimes', 'array'],
            'target_audience.en.*' => ['string', 'max:'.config('field_limits.medium')],
            'target_audience.ar' => ['sometimes', 'array'],
            'target_audience.ar.*' => ['string', 'max:'.config('field_limits.medium')],

            'learning_outcomes' => ['sometimes', 'array'],
            'learning_outcomes.en' => ['sometimes', 'array'],
            'learning_outcomes.en.*' => ['string', 'max:'.config('field_limits.medium')],
            'learning_outcomes.ar' => ['sometimes', 'array'],
            'learning_outcomes.ar.*' => ['string', 'max:'.config('field_limits.medium')],

            /* ─── Media & stats ──────────────────────────────────────────── */
            'cover_image' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.url')],
            'rating' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:5'],
            'students_count' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'total_hours' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'duration_label_en' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.short')],
            'duration_label_ar' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.short')],
            'last_updated_at' => ['sometimes', 'nullable', 'date'],

            /* ─── Instructor ─────────────────────────────────────────────── */
            'instructor_name' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.name')],
            'instructor_name_ar' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.name')],
            'instructor_title_en' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.medium')],
            'instructor_title_ar' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.medium')],
            'instructor_bio_en' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.long')],
            'instructor_bio_ar' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.long')],
            'instructor_photo' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.url')],
            'instructor_trained' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.short')],
            'instructor_countries' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:500'],
            'instructor_credentials' => ['sometimes', 'array'],
            'instructor_credentials.en' => ['sometimes', 'array'],
            'instructor_credentials.en.*' => ['string', 'max:'.config('field_limits.medium')],
            'instructor_credentials.ar' => ['sometimes', 'array'],
            'instructor_credentials.ar.*' => ['string', 'max:'.config('field_limits.medium')],

            /* ─── SEO ────────────────────────────────────────────────────── */
            'seo_title' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.medium')],
            'seo_description' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.medium')],
            'seo_keywords' => ['sometimes', 'nullable', 'array'],
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
            'original_price.gte' => 'The original price must be greater than or equal to the price.',
        ];
    }

    protected function prepareForValidation(): void
    {
        // `default_mode` must be one of the modes actually offered.
        $modes = $this->input('available_modes');
        $default = $this->input('default_mode');

        if (is_array($modes) && $modes !== [] && $default !== null && ! in_array($default, $modes, true)) {
            $this->merge(['default_mode' => $modes[0]]);
        }
    }

    /**
     * Only the keys the client actually sent, so a partial tab save never
     * nulls out untouched columns.
     *
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        return $this->safe()->all();
    }
}
