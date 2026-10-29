<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseSeoFieldsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['is_admin' => true, 'is_active' => true]);
    }

    public function test_admin_can_save_bilingual_seo_fields(): void
    {
        $course = Course::factory()->create();

        $payload = [
            'seo_title_en' => 'PMP Prep Course | Creativity House',
            'seo_title_ar' => 'دورة التحضير لـ PMP | دار الإبداع',
            'seo_description_en' => str_repeat('a', 160),
            'seo_description_ar' => str_repeat('ب', 160),
        ];

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/courses/{$course->id}", $payload)
            ->assertOk()
            ->assertJsonPath('data.seo_title_en', $payload['seo_title_en'])
            ->assertJsonPath('data.seo_title_ar', $payload['seo_title_ar'])
            ->assertJsonPath('data.seo_description_en', $payload['seo_description_en'])
            ->assertJsonPath('data.seo_description_ar', $payload['seo_description_ar']);

        $this->assertDatabaseHas('courses', [
            'id' => $course->id,
            'seo_title_en' => $payload['seo_title_en'],
            'seo_title_ar' => $payload['seo_title_ar'],
        ]);
    }

    public function test_public_course_endpoint_returns_seo_fields(): void
    {
        $course = Course::factory()->create([
            'seo_title_en' => 'Public SEO Title EN',
            'seo_title_ar' => 'عنوان SEO عام',
            'seo_description_en' => 'Public SEO description in English for testing.',
            'seo_description_ar' => 'وصف SEO عام بالعربية للاختبار.',
            'is_published' => true,
            'is_public' => true,
        ]);

        $this->getJson("/api/courses/{$course->slug}")
            ->assertOk()
            ->assertJsonPath('data.seo_title_en', 'Public SEO Title EN')
            ->assertJsonPath('data.seo_title_ar', 'عنوان SEO عام')
            ->assertJsonPath('data.seo.description_en', 'Public SEO description in English for testing.')
            ->assertJsonPath('data.seo.description_ar', 'وصف SEO عام بالعربية للاختبار.');
    }

    public function test_empty_seo_values_are_allowed(): void
    {
        $course = Course::factory()->create([
            'seo_title_en' => 'Temp',
            'seo_description_en' => 'Temp desc',
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/courses/{$course->id}", [
                'seo_title_en' => null,
                'seo_title_ar' => null,
                'seo_description_en' => null,
                'seo_description_ar' => null,
            ])
            ->assertOk();

        $course->refresh();
        $this->assertNull($course->seo_title_en);
        $this->assertNull($course->seo_description_en);
    }
}
