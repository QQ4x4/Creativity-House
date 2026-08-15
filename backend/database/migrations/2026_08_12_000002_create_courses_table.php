<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table) {
            $table->id();

            $table->string('title', 200);
            $table->string('slug', 220)->unique();
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2)->default(0);
            $table->char('currency', 3)->default('USD');

            // Relative disk path or absolute URL — CourseResource resolves both.
            $table->string('cover_image', 2048)->nullable();
            $table->decimal('total_hours', 6, 2)->default(0);

            // Rendered on the student course card (frontend EnrolledCourse contract).
            $table->string('instructor_name', 150)->nullable();
            $table->string('level', 50)->nullable();

            $table->boolean('is_published')->default(false);
            $table->unsignedInteger('sort_order')->default(0);

            // SEO
            $table->string('seo_title', 200)->nullable();
            $table->string('seo_description', 500)->nullable();
            $table->json('seo_keywords')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_published', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('courses');
    }
};
