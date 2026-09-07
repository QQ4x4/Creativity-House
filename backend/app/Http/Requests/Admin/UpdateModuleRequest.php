<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateModuleRequest extends FormRequest
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
            'title_en' => ['sometimes', 'required', 'string', 'max:'.config('field_limits.medium')],
            'title_ar' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.medium')],
            'duration_label_en' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.short')],
            'duration_label_ar' => ['sometimes', 'nullable', 'string', 'max:'.config('field_limits.short')],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
