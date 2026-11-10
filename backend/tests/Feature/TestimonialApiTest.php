<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\SuccessStoriesPage;
use App\Models\Testimonial;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TestimonialApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['is_admin' => true, 'is_active' => true]);
    }

    public function test_non_admin_cannot_manage_testimonials(): void
    {
        $student = User::factory()->create(['is_admin' => false]);

        $this->actingAs($student, 'sanctum')
            ->getJson('/api/v1/admin/testimonials')
            ->assertForbidden();

        $this->actingAs($student, 'sanctum')
            ->postJson('/api/v1/admin/testimonials', [
                'bunny_video_id' => 'vid-1',
            ])
            ->assertForbidden();
    }

    public function test_guest_cannot_manage_testimonials(): void
    {
        $this->getJson('/api/v1/admin/testimonials')->assertUnauthorized();
    }

    public function test_admin_can_crud_testimonials(): void
    {
        $course = Course::factory()->create();

        $create = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/testimonials', [
                'bunny_video_id' => 'bunny-guid-1',
                'video_title' => 'My story',
                'duration_seconds' => 95,
                'orientation' => 'landscape',
                'person_name_en' => 'Sara Ali',
                'person_role_en' => 'PM, Aramco',
                'caption_en' => 'Passed PMP on first try',
                'course_id' => $course->id,
                'is_published' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.bunny_video_id', 'bunny-guid-1')
            ->assertJsonPath('data.person_name_en', 'Sara Ali')
            ->assertJsonPath('data.is_published', true);

        $id = (int) $create->json('data.id');

        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/testimonials')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/testimonials/{$id}", [
                'caption_en' => 'Updated caption',
                'person_name_ar' => 'سارة علي',
            ])
            ->assertOk()
            ->assertJsonPath('data.caption_en', 'Updated caption')
            ->assertJsonPath('data.person_name_ar', 'سارة علي');

        $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/admin/testimonials/{$id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('testimonials', ['id' => $id]);
    }

    public function test_reorder_updates_positions(): void
    {
        $a = Testimonial::factory()->create(['position' => 1, 'person_name_en' => 'A']);
        $b = Testimonial::factory()->create(['position' => 2, 'person_name_en' => 'B']);
        $c = Testimonial::factory()->create(['position' => 3, 'person_name_en' => 'C']);

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson('/api/v1/admin/testimonials/reorder', [
                'ids' => [$c->id, $a->id, $b->id],
            ])
            ->assertOk()
            ->assertJsonPath('data.0.id', $c->id)
            ->assertJsonPath('data.1.id', $a->id)
            ->assertJsonPath('data.2.id', $b->id);

        $this->assertSame(1, $c->fresh()->position);
        $this->assertSame(2, $a->fresh()->position);
        $this->assertSame(3, $b->fresh()->position);
    }

    public function test_only_one_testimonial_can_be_featured(): void
    {
        $first = Testimonial::factory()->featured()->create(['person_name_en' => 'First']);
        $second = Testimonial::factory()->create(['person_name_en' => 'Second', 'is_published' => true]);

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/testimonials/{$second->id}/feature")
            ->assertOk()
            ->assertJsonPath('data.is_featured', true);

        $this->assertFalse($first->fresh()->is_featured);
        $this->assertTrue($second->fresh()->is_featured);
        $this->assertSame(1, Testimonial::query()->where('is_featured', true)->count());
    }

    public function test_public_api_hides_unpublished_and_returns_page_settings(): void
    {
        SuccessStoriesPage::current();

        $published = Testimonial::factory()->featured()->create([
            'person_name_en' => 'Published Person',
            'caption_en' => 'Visible caption',
            'position' => 1,
        ]);
        Testimonial::factory()->draft()->create([
            'person_name_en' => 'Draft Person',
            'position' => 2,
        ]);

        $response = $this->getJson('/api/v1/success-stories?lang=en')
            ->assertOk()
            ->assertJsonPath('data.featured.id', $published->id)
            ->assertJsonPath('data.featured.person_name', 'Published Person')
            ->assertJsonCount(1, 'data.testimonials');

        $response->assertJsonStructure([
            'data' => [
                'page' => [
                    'hero_title_en',
                    'hero_title_ar',
                    'cta_button_en',
                    'cta_link',
                ],
                'featured' => [
                    'id',
                    'embed_url',
                    'thumbnail_url',
                    'person_name',
                ],
                'testimonials',
            ],
        ]);

        $this->assertStringContainsString(
            'iframe.mediadelivery.net/embed/',
            (string) $response->json('data.featured.embed_url')
        );
    }

    public function test_admin_can_update_page_settings(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->patchJson('/api/v1/admin/success-stories/page', [
                'hero_title_en' => 'Our Wins',
                'hero_title_ar' => 'إنجازاتنا',
                'cta_button_en' => 'Browse courses',
                'cta_link' => '/courses',
            ])
            ->assertOk()
            ->assertJsonPath('data.hero_title_en', 'Our Wins')
            ->assertJsonPath('data.hero_title_ar', 'إنجازاتنا');

        $this->getJson('/api/v1/success-stories')
            ->assertOk()
            ->assertJsonPath('data.page.hero_title_en', 'Our Wins');
    }

    public function test_publish_toggle(): void
    {
        $row = Testimonial::factory()->draft()->create();

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/testimonials/{$row->id}/publish", [
                'is_published' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.is_published', true);

        $this->getJson('/api/v1/success-stories')
            ->assertOk()
            ->assertJsonCount(1, 'data.testimonials');
    }
}
