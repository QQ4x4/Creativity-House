<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cohort schedules: one batch spanning many editable sessions (+ optional phases).
 * Existing rows default to type=separate and keep current per-date batch behaviour.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_schedules', function (Blueprint $table) {
            $table->string('type', 16)->default('separate')->after('course_id');
            $table->json('phases')->nullable()->after('batch_number');
            $table->date('enrollment_closes_at')->nullable()->after('enrollment_closes_hours');
        });

        Schema::create('course_schedule_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_schedule_id')
                ->constrained('course_schedules')
                ->cascadeOnDelete();
            $table->unsignedSmallInteger('position')->default(1);
            $table->date('date');
            $table->time('start_time');
            $table->time('end_time');
            $table->string('title_en', 255)->nullable();
            $table->string('title_ar', 255)->nullable();
            $table->unsignedTinyInteger('phase_index')->nullable();
            $table->timestamps();

            $table->unique(['course_schedule_id', 'date']);
            $table->index(['course_schedule_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_schedule_sessions');

        Schema::table('course_schedules', function (Blueprint $table) {
            $table->dropColumn(['type', 'phases', 'enrollment_closes_at']);
        });
    }
};
