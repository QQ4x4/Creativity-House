<?php

namespace Database\Seeders;

use App\Models\Course;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;

/**
 * Clones the richest public catalog course into a $1 live-payment test listing.
 *
 * The Next.js /courses card (`CatalogCourseCard`) needs cover, badge, title,
 * subtitle, rating, studentsCount, durationLabel, instructorName, price,
 * originalPrice, slug, defaultMode, and category. PublicCatalogController only
 * returns rows with is_published = true AND is_public = true.
 *
 * NOT wired into DatabaseSeeder — run it explicitly:
 *   php artisan db:seed --class=LivePaymentTestCourseSeeder
 *
 * Idempotent on slug so re-running updates rather than duplicating.
 */
class LivePaymentTestCourseSeeder extends Seeder
{
    private const SLUG = 'live-payment-test-course';

    private const TITLE = 'Live Payment Test Course';

    private const DESCRIPTION = 'This is a live 1-dollar test course to verify the production payment gateway.';

    private const PRICE = '1.00';

    private const LEGACY_SLUG = 'stripe-live-verification-test';

    public function run(): void
    {
        Course::query()->where('slug', self::LEGACY_SLUG)->delete();

        $source = $this->findSourceCourse();

        if (! $source) {
            $this->command?->error(
                'No public catalog course found to clone. Run PublicCatalogSeeder first.'
            );

            return;
        }

        $course = Course::updateOrCreate(
            ['slug' => self::SLUG],
            $this->clonedAttributes($source)
        );

        $this->clearCatalogCache();

        $this->command?->info(sprintf(
            'Live payment test course ready (id %d, $%s, cloned from %s).',
            $course->id,
            self::PRICE,
            $source->slug
        ));
    }

    private function findSourceCourse(): ?Course
    {
        $preferred = Course::query()
            ->publicCatalog()
            ->where('slug', 'pmp-live-training')
            ->first();

        if ($preferred) {
            return $preferred;
        }

        return Course::query()
            ->publicCatalog()
            ->get()
            ->sortByDesc(fn (Course $course): int => $this->completenessScore($course))
            ->first();
    }

    /**
     * Score how completely a course can fill CatalogCourseCard + PublicCourseResource.
     */
    private function completenessScore(Course $course): int
    {
        $score = 0;

        foreach ([
            'cover_image',
            'badge',
            'badge_ar',
            'title_en',
            'title_ar',
            'subtitle_en',
            'subtitle_ar',
            'rating',
            'duration_label_en',
            'duration_label_ar',
            'instructor_name',
            'instructor_photo',
            'category',
            'catalog_modes',
            'curriculum',
        ] as $field) {
            if (filled($course->{$field})) {
                $score++;
            }
        }

        if ((int) $course->students_count > 0) {
            $score++;
        }

        return $score;
    }

    /**
     * @return array<string, mixed>
     */
    private function clonedAttributes(Course $source): array
    {
        $payload = [];

        foreach ($source->getFillable() as $field) {
            $payload[$field] = $source->{$field};
        }

        $payload['title'] = self::TITLE;
        $payload['title_en'] = self::TITLE;
        $payload['title_ar'] = self::TITLE;
        $payload['slug'] = self::SLUG;
        $payload['price'] = self::PRICE;
        $payload['original_price'] = self::PRICE;
        $payload['description'] = self::DESCRIPTION;
        $payload['description_en'] = self::DESCRIPTION;
        $payload['description_ar'] = self::DESCRIPTION;
        $payload['is_published'] = true;
        $payload['is_public'] = true;
        $payload['sort_order'] = 0;
        $payload['seo_title'] = self::TITLE.' | Creativity House';
        $payload['seo_description'] = self::DESCRIPTION;
        $payload['catalog_modes'] = $this->withTestPrices($source->catalog_modes ?? []);

        return $payload;
    }

    /**
     * Keep mode visuals (duration, features) but force every mode to $1.00
     * so the listing card and detail pricing stay in sync with Stripe.
     *
     * @param  array<string, mixed>  $modes
     * @return array<string, mixed>
     */
    private function withTestPrices(array $modes): array
    {
        $priced = [];

        foreach ($modes as $key => $mode) {
            if (! is_array($mode)) {
                $priced[$key] = $mode;

                continue;
            }

            $mode['price'] = 1.00;
            if (array_key_exists('original_price', $mode)) {
                $mode['original_price'] = 1.00;
            }
            $priced[$key] = $mode;
        }

        return $priced;
    }

    /**
     * PublicCatalogController is uncached today; forget likely keys anyway so a
     * later catalog cache cannot hide this course after seeding.
     */
    private function clearCatalogCache(): void
    {
        foreach ([
            'public_catalog',
            'courses.public',
            'api.courses',
            'catalog.courses',
        ] as $key) {
            Cache::forget($key);
        }
    }
}
