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
            'title_en' => ['sometimes', 'required', 'string', 'max:200'],
            'title_ar' => ['sometimes', 'nullable', 'string', 'max:200'],
            'subtitle_en' => ['sometimes', 'nullable', 'string', 'max:300'],
            'subtitle_ar' => ['sometimes', 'nullable', 'string', 'max:300'],
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:200',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('courses', 'slug')->ignore($courseId)->whereNull('deleted_at'),
            ],
            'badge' => ['sometimes', 'nullable', 'string', 'max:80'],
            'badge_ar' => ['sometimes', 'nullable', 'string', 'max:80'],
            'category' => ['sometimes', 'nullable', Rule::in(self::CATEGORIES)],
            'language_en' => ['sometimes', 'nullable', 'string', 'max:80'],
            'language_ar' => ['sometimes', 'nullable', 'string', 'max:80'],
            'level' => ['sometimes', 'nullable', 'string', 'max:40'],

            /* ─── Publishing ─────────────────────────────────────────────── */
            'is_published' => ['sometimes', 'boolean'],
            'is_public' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],

            /* ─── Pricing & modes ────────────────────────────────────────── */
            'price' => ['sometimes', 'required', 'numeric', 'min:0', 'max:999999.99'],
            'original_price' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:999999.99', 'gte:price'],
            'currency' => ['sometimes', 'nullable', 'string', 'size:3'],
            'available_modes' => ['sometimes', 'array'],
            'available_modes.*' => [Rule::in(self::MODES)],
            'default_mode' => ['sometimes', 'nullable', Rule::in(self::MODES)],

            // catalog_modes is a keyed map: { live: { price, original_price, ... } }
            'catalog_modes' => ['sometimes', 'nullable', 'array'],
            'catalog_modes.*.price' => ['nullable', 'numeric', 'min:0'],
            'catalog_modes.*.original_price' => ['nullable', 'numeric', 'min:0'],
            'catalog_modes.*.duration_en' => ['nullable', 'string', 'max:120'],
            'catalog_modes.*.duration_ar' => ['nullable', 'string', 'max:120'],
            'catalog_modes.*.features_en' => ['nullable', 'array'],
            'catalog_modes.*.features_en.*' => ['string', 'max:300'],
            'catalog_modes.*.features_ar' => ['nullable', 'array'],
            'catalog_modes.*.features_ar.*' => ['string', 'max:300'],

            /* ─── Marketing ──────────────────────────────────────────────── */
            'description_en' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'description_ar' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'schedule_en' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'schedule_ar' => ['sometimes', 'nullable', 'string', 'max:20000'],

            'target_audience' => ['sometimes', 'array'],
            'target_audience.en' => ['sometimes', 'array'],
            'target_audience.en.*' => ['string', 'max:300'],
            'target_audience.ar' => ['sometimes', 'array'],
            'target_audience.ar.*' => ['string', 'max:300'],

            'learning_outcomes' => ['sometimes', 'array'],
            'learning_outcomes.en' => ['sometimes', 'array'],
            'learning_outcomes.en.*' => ['string', 'max:300'],
            'learning_outcomes.ar' => ['sometimes', 'array'],
            'learning_outcomes.ar.*' => ['string', 'max:300'],

            /* ─── Media & stats ──────────────────────────────────────────── */
            'cover_image' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'rating' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:5'],
            'students_count' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'total_hours' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'duration_label_en' => ['sometimes', 'nullable', 'string', 'max:80'],
            'duration_label_ar' => ['sometimes', 'nullable', 'string', 'max:80'],
            'last_updated_at' => ['sometimes', 'nullable', 'date'],

            /* ─── Instructor ─────────────────────────────────────────────── */
            'instructor_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'instructor_name_ar' => ['sometimes', 'nullable', 'string', 'max:150'],
            'instructor_title_en' => ['sometimes', 'nullable', 'string', 'max:200'],
            'instructor_title_ar' => ['sometimes', 'nullable', 'string', 'max:200'],
            'instructor_bio_en' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'instructor_bio_ar' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'instructor_photo' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'instructor_trained' => ['sometimes', 'nullable', 'string', 'max:40'],
            'instructor_countries' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:500'],
            'instructor_credentials' => ['sometimes', 'array'],
            'instructor_credentials.en' => ['sometimes', 'array'],
            'instructor_credentials.en.*' => ['string', 'max:300'],
            'instructor_credentials.ar' => ['sometimes', 'array'],
            'instructor_credentials.ar.*' => ['string', 'max:300'],

            /* ─── SEO ────────────────────────────────────────────────────── */
            'seo_title' => ['sometimes', 'nullable', 'string', 'max:200'],
            'seo_description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'seo_keywords' => ['sometimes', 'nullable', 'array'],
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
