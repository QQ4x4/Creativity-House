<?php

namespace App\Http\Requests\Concerns;

trait SanitizesAuthInput
{
    /**
     * Trim and strip tags from string fields before validation.
     *
     * @param  list<string>  $fields
     */
    protected function sanitizeFields(array $fields): void
    {
        $payload = $this->all();

        foreach ($fields as $field) {
            if (! array_key_exists($field, $payload) || ! is_string($payload[$field])) {
                continue;
            }

            $value = trim(strip_tags($payload[$field]));
            // Neutralize residual angle brackets without altering password complexity characters.
            $value = str_replace(['<', '>'], '', $value);
            $payload[$field] = $value;
        }

        $this->replace($payload);
    }
}
