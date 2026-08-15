<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lessons', function (Blueprint $table) {
            $table->id();

            $table->foreignId('course_id')->constrained()->cascadeOnDelete();

            // Modules are a grouping label rather than their own table: the student
            // sidebar only needs ordered groups, and this keeps the admin panel to a
            // single editable list per course. LessonResource derives a stable
            // `module_id` by slugging this value.
            $table->string('module_name', 150)->default('');

            $table->string('title', 200);
            $table->string('video_url', 2048)->nullable();

            // Duration in SECONDS (frontend formats it; never store pre-formatted text).
            $table->unsignedInteger('duration')->default(0);

            $table->json('pdf_resource_urls')->nullable();

            $table->boolean('is_locked')->default(false);
            $table->unsignedInteger('sort_order')->default(0);

            $table->timestamps();
            $table->softDeletes();

            $table->index(['course_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lessons');
    }
};
