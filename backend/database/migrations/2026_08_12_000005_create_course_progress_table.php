<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_progress', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();

            // Array of lesson IDs. Denormalized on purpose: the student portal always
            // reads the whole set at once, and it keeps toggling to a single row write.
            $table->json('completed_lessons')->nullable();

            $table->unsignedTinyInteger('completion_percentage')->default(0);
            $table->unsignedInteger('total_learning_seconds')->default(0);

            // Resume target for "Continue Learning".
            $table->foreignId('last_lesson_id')->nullable()->constrained('lessons')->nullOnDelete();

            // Set when the course first reaches 100% — drives certificate_earned.
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['user_id', 'course_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_progress');
    }
};
