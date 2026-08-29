<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Decoupled certificate awards — never inferred from course_progress %.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_certificates', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->timestamp('awarded_at');
            $table->foreignId('awarded_by_admin_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->unique(['user_id', 'course_id']);
            $table->index(['course_id', 'awarded_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_certificates');
    }
};
