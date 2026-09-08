<?php

namespace App\Services\Admin;

use App\Models\Course;
use App\Models\CoursePricingTier;
use Illuminate\Support\Facades\DB;

/**
 * Upserts delivery-mode pricing tiers and keeps legacy `catalog_modes` JSON
 * in sync so checkout / older consumers keep working.
 */
class CoursePricingTierService
{
    private const MODE_ORDER = ['live', 'recorded', 'simulator'];

    /**
     * @param  list<array<string, mixed>>  $tiers
     */
    public function sync(Course $course, array $tiers): void
    {
        DB::transaction(function () use ($course, $tiers): void {
            $normalized = $this->normalize($tiers);
            $keepModes = [];

            foreach ($normalized as $index => $tier) {
                $keepModes[] = $tier['mode'];

                CoursePricingTier::query()->updateOrCreate(
                    [
                        'course_id' => $course->id,
                        'mode' => $tier['mode'],
                    ],
                    [
                        'price' => $tier['price'],
                        'original_price' => $tier['original_price'],
                        'duration_hours' => $tier['duration_hours'],
                        'badge_text_en' => $tier['badge_text_en'],
                        'badge_text_ar' => $tier['badge_text_ar'],
                        'features_en' => $tier['features_en'],
                        'features_ar' => $tier['features_ar'],
                        'guarantee_title_en' => $tier['guarantee_title_en'],
                        'guarantee_title_ar' => $tier['guarantee_title_ar'],
                        'guarantee_text_en' => $tier['guarantee_text_en'],
                        'guarantee_text_ar' => $tier['guarantee_text_ar'],
                        'sort_order' => $index,
                    ]
                );
            }

            CoursePricingTier::query()
                ->where('course_id', $course->id)
                ->when(
                    $keepModes !== [],
                    fn ($q) => $q->whereNotIn('mode', $keepModes),
                    fn ($q) => $q
                )
                ->delete();

            $this->mirrorCatalogModes($course, $normalized);
        });
    }

    /**
     * @param  list<array<string, mixed>>  $tiers
     * @return list<array<string, mixed>>
     */
    private function normalize(array $tiers): array
    {
        $byMode = [];

        foreach ($tiers as $tier) {
            if (! is_array($tier)) {
                continue;
            }

            $mode = (string) ($tier['mode'] ?? '');
            if (! in_array($mode, self::MODE_ORDER, true)) {
                continue;
            }

            $featuresEn = $this->stringList($tier['features_en'] ?? []);
            $featuresAr = $this->stringList($tier['features_ar'] ?? []);

            $byMode[$mode] = [
                'mode' => $mode,
                'price' => round((float) ($tier['price'] ?? 0), 2),
                'original_price' => isset($tier['original_price']) && $tier['original_price'] !== '' && $tier['original_price'] !== null
                    ? round((float) $tier['original_price'], 2)
                    : null,
                'duration_hours' => max(0, (int) ($tier['duration_hours'] ?? 0)),
                'badge_text_en' => $this->nullableString($tier['badge_text_en'] ?? null),
                'badge_text_ar' => $this->nullableString($tier['badge_text_ar'] ?? null),
                'features_en' => $featuresEn,
                'features_ar' => $featuresAr,
                'guarantee_title_en' => $this->nullableString($tier['guarantee_title_en'] ?? null),
                'guarantee_title_ar' => $this->nullableString($tier['guarantee_title_ar'] ?? null),
                'guarantee_text_en' => $this->nullableString($tier['guarantee_text_en'] ?? null),
                'guarantee_text_ar' => $this->nullableString($tier['guarantee_text_ar'] ?? null),
            ];
        }

        $ordered = [];
        foreach (self::MODE_ORDER as $mode) {
            if (isset($byMode[$mode])) {
                $ordered[] = $byMode[$mode];
            }
        }

        return $ordered;
    }

    /**
     * @param  list<array<string, mixed>>  $normalized
     */
    private function mirrorCatalogModes(Course $course, array $normalized): void
    {
        $map = [];

        foreach ($normalized as $tier) {
            $hours = (int) $tier['duration_hours'];
            $map[$tier['mode']] = [
                'price' => $tier['price'],
                'original_price' => $tier['original_price'],
                'duration_en' => $hours > 0 ? "{$hours} hours" : '',
                'duration_ar' => $hours > 0 ? "{$hours} ساعة" : '',
                'features_en' => $tier['features_en'],
                'features_ar' => $tier['features_ar'],
            ];
        }

        $course->forceFill(['catalog_modes' => $map])->save();
    }

    /**
     * @param  mixed  $value
     * @return list<string>
     */
    private function stringList(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $out = [];
        foreach ($value as $item) {
            if (is_array($item) && array_key_exists('value', $item)) {
                $item = $item['value'];
            }
            $text = trim((string) $item);
            if ($text !== '') {
                $out[] = $text;
            }
        }

        return array_values($out);
    }

    private function nullableString(mixed $value): ?string
    {
        $text = trim((string) ($value ?? ''));

        return $text === '' ? null : $text;
    }
}
