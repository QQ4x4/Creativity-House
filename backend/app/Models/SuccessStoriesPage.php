<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Single-row settings for the public Success Stories page.
 *
 * @property int $id
 * @property string|null $hero_title_en
 * @property string|null $hero_title_ar
 * @property string|null $hero_subtitle_en
 * @property string|null $hero_subtitle_ar
 * @property string|null $cta_title_en
 * @property string|null $cta_title_ar
 * @property string|null $cta_button_en
 * @property string|null $cta_button_ar
 * @property string $cta_link
 */
class SuccessStoriesPage extends Model
{
    protected $table = 'success_stories_page';

    protected $fillable = [
        'hero_title_en',
        'hero_title_ar',
        'hero_subtitle_en',
        'hero_subtitle_ar',
        'cta_title_en',
        'cta_title_ar',
        'cta_button_en',
        'cta_button_ar',
        'cta_link',
    ];

    public static function current(): self
    {
        $row = static::query()->orderBy('id')->first();

        if ($row) {
            return $row;
        }

        return static::query()->create([
            'hero_title_en' => 'Success Stories',
            'hero_title_ar' => 'قصص النجاح',
            'hero_subtitle_en' => 'Hear from professionals who advanced their careers through our accredited training.',
            'hero_subtitle_ar' => 'استمع إلى محترفين طوّروا مسيرتهم المهنية عبر برامجنا التدريبية المعتمدة.',
            'cta_title_en' => 'Ready to write your own success story?',
            'cta_title_ar' => 'جاهز لكتابة قصة نجاحك؟',
            'cta_button_en' => 'Explore courses',
            'cta_button_ar' => 'استكشف الدورات',
            'cta_link' => '/courses',
        ]);
    }
}
