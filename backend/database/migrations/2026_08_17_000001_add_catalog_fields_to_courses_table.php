<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->boolean('is_public')->default(false)->after('is_published');
            $table->string('title_en', 200)->nullable()->after('title');
            $table->string('title_ar', 200)->nullable()->after('title_en');
            $table->string('subtitle_en', 300)->nullable()->after('title_ar');
            $table->string('subtitle_ar', 300)->nullable()->after('subtitle_en');
            $table->text('description_en')->nullable()->after('description');
            $table->text('description_ar')->nullable()->after('description_en');
            $table->decimal('original_price', 10, 2)->nullable()->after('price');
            $table->string('badge', 80)->nullable()->after('level');
            $table->string('badge_ar', 80)->nullable()->after('badge');
            $table->string('category', 40)->nullable()->after('badge_ar');
            $table->decimal('rating', 3, 2)->nullable()->after('category');
            $table->unsignedInteger('students_count')->default(0)->after('rating');
            $table->string('duration_label_en', 80)->nullable()->after('total_hours');
            $table->string('duration_label_ar', 80)->nullable()->after('duration_label_en');
            $table->string('language_en', 80)->nullable()->after('duration_label_ar');
            $table->string('language_ar', 80)->nullable()->after('language_en');
            $table->date('last_updated_at')->nullable()->after('language_ar');
            $table->string('default_mode', 20)->nullable()->after('last_updated_at');
            $table->json('available_modes')->nullable()->after('default_mode');
            $table->json('learning_outcomes')->nullable()->after('available_modes');
            $table->json('curriculum')->nullable()->after('learning_outcomes');
            $table->json('target_audience')->nullable()->after('curriculum');
            $table->json('catalog_modes')->nullable()->after('target_audience');
            $table->text('instructor_bio_en')->nullable()->after('instructor_name');
            $table->text('instructor_bio_ar')->nullable()->after('instructor_bio_en');
            $table->string('instructor_photo', 2048)->nullable()->after('instructor_bio_ar');
            $table->json('instructor_credentials')->nullable()->after('instructor_photo');
            $table->text('schedule_en')->nullable()->after('instructor_credentials');
            $table->text('schedule_ar')->nullable()->after('schedule_en');

            $table->index(['is_public', 'is_published', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropIndex(['is_public', 'is_published', 'sort_order']);
            $table->dropColumn([
                'is_public',
                'title_en',
                'title_ar',
                'subtitle_en',
                'subtitle_ar',
                'description_en',
                'description_ar',
                'original_price',
                'badge',
                'badge_ar',
                'category',
                'rating',
                'students_count',
                'duration_label_en',
                'duration_label_ar',
                'language_en',
                'language_ar',
                'last_updated_at',
                'default_mode',
                'available_modes',
                'learning_outcomes',
                'curriculum',
                'target_audience',
                'catalog_modes',
                'instructor_bio_en',
                'instructor_bio_ar',
                'instructor_photo',
                'instructor_credentials',
                'schedule_en',
                'schedule_ar',
            ]);
        });
    }
};
