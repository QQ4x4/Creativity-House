<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreModuleRequest extends FormRequest
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
            'title_en' => ['required', 'string', 'max:'.config('field_limits.medium')],
            'title_ar' => ['nullable', 'string', 'max:'.config('field_limits.medium')],
            'duration_label_en' => ['nullable', 'string', 'max:'.config('field_limits.short')],
            'duration_label_ar' => ['nullable', 'string', 'max:'.config('field_limits.short')],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
