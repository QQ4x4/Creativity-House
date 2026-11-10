<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('testimonials', function (Blueprint $table) {
            $table->id();
            $table->string('bunny_video_id', 64);
            $table->string('bunny_collection_id', 64)->nullable();
            $table->string('video_title')->nullable();
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->string('orientation', 16)->default('landscape'); // landscape|portrait
            $table->string('person_name_en')->nullable();
            $table->string('person_name_ar')->nullable();
            $table->string('person_role_en')->nullable();
            $table->string('person_role_ar')->nullable();
            $table->string('country')->nullable();
            $table->foreignId('course_id')->nullable()->constrained('courses')->nullOnDelete();
            $table->string('caption_en')->nullable();
            $table->string('caption_ar')->nullable();
            $table->text('quote_en')->nullable();
            $table->text('quote_ar')->nullable();
            $table->string('custom_thumbnail_path')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_published')->default(false);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->index(['is_published', 'position']);
            $table->index('is_featured');
            $table->index('bunny_video_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('testimonials');
    }
};
