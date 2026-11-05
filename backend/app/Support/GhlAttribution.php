<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Pull attribution fields already accepted on public forms (when present).
 *
 * @return array{
 *   lang: string,
 *   country: ?string,
 *   utm_source: ?string,
 *   utm_medium: ?string,
 *   utm_campaign: ?string,
 *   gclid: ?string,
 *   fbclid: ?string,
 * }
 */
final class GhlAttribution
{
    public static function fromRequest(Request $request): array
    {
        $lang = strtolower((string) $request->input('lang', ''));
        if ($lang !== 'ar' && $lang !== 'en') {
            $accept = strtolower((string) $request->header('Accept-Language', ''));
            $lang = str_starts_with($accept, 'ar') ? 'ar' : 'en';
        }

        $stringOrNull = static function (mixed $value): ?string {
            if (! is_string($value)) {
                return null;
            }
            $trimmed = trim($value);

            return $trimmed !== '' ? $trimmed : null;
        };

        return [
            'lang' => $lang,
            'country' => $stringOrNull($request->input('country')),
            'utm_source' => $stringOrNull($request->input('utm_source')),
            'utm_medium' => $stringOrNull($request->input('utm_medium')),
            'utm_campaign' => $stringOrNull($request->input('utm_campaign')),
            'gclid' => $stringOrNull($request->input('gclid')),
            'fbclid' => $stringOrNull($request->input('fbclid')),
        ];
    }
}
