<?php

namespace Tests\Unit;

use App\Support\PublicMediaUrl;
use Tests\TestCase;

class PublicMediaUrlTest extends TestCase
{
    public function test_relative_storage_paths_use_app_url(): void
    {
        config(['app.url' => 'http://localhost:8000']);

        $this->assertSame(
            'http://localhost:8000/storage/uploads/photo.jpg',
            PublicMediaUrl::resolve('uploads/photo.jpg')
        );
    }

    public function test_storage_prefixed_relative_paths_use_app_url(): void
    {
        config(['app.url' => 'http://localhost:8000']);

        $this->assertSame(
            'http://localhost:8000/storage/uploads/photo.jpg',
            PublicMediaUrl::resolve('storage/uploads/photo.jpg')
        );
    }

    public function test_absolute_storage_urls_are_rewritten_to_current_app_url(): void
    {
        config(['app.url' => 'https://api.creativity-house.com']);

        $this->assertSame(
            'https://api.creativity-house.com/storage/uploads/photo.jpg',
            PublicMediaUrl::resolve('http://127.0.0.1:8000/storage/uploads/photo.jpg')
        );
    }

    public function test_external_https_urls_are_left_alone(): void
    {
        config(['app.url' => 'http://localhost:8000']);

        $this->assertSame(
            'https://cdn.example.com/avatar.png',
            PublicMediaUrl::resolve('https://cdn.example.com/avatar.png')
        );
    }

    public function test_frontend_root_relative_paths_are_left_alone(): void
    {
        config(['app.url' => 'http://localhost:8000']);

        $this->assertSame(
            '/images/DR.jpg',
            PublicMediaUrl::resolve('/images/DR.jpg')
        );
    }

    public function test_root_relative_storage_paths_become_absolute_api_urls(): void
    {
        config(['app.url' => 'http://localhost:8000']);

        $this->assertSame(
            'http://localhost:8000/storage/uploads/trainer.jpg',
            PublicMediaUrl::resolve('/storage/uploads/trainer.jpg')
        );
    }

    public function test_api_host_frontend_asset_urls_are_stripped_to_path(): void
    {
        config(['app.url' => 'http://localhost:8000']);

        $this->assertSame(
            '/images/DR.jpg',
            PublicMediaUrl::resolve('http://localhost:8000/images/DR.jpg')
        );
    }

    public function test_blank_values_return_null(): void
    {
        $this->assertNull(PublicMediaUrl::resolve(null));
        $this->assertNull(PublicMediaUrl::resolve(''));
        $this->assertNull(PublicMediaUrl::resolve('   '));
    }

    /**
     * The three value types the public schedule cards must handle.
     */
    public function test_three_photo_value_types_for_schedule_cards(): void
    {
        config(['app.url' => 'http://localhost:8000']);

        // 1) Full https URL — keep as is.
        $this->assertSame(
            'https://cdn.example.com/trainer.png',
            PublicMediaUrl::resolve('https://cdn.example.com/trainer.png')
        );

        // 2) Frontend root-relative path — keep as is (browser loads from website).
        $this->assertSame(
            '/images/DR.jpg',
            PublicMediaUrl::resolve('/images/DR.jpg')
        );

        // 3) Laravel storage path — absolute API storage URL.
        $this->assertSame(
            'http://localhost:8000/storage/uploads/ada.jpg',
            PublicMediaUrl::resolve('uploads/ada.jpg')
        );
    }
}
