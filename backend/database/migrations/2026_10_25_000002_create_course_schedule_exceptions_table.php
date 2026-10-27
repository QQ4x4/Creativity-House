<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('course_schedule_exceptions')) {
            return;
        }

        Schema::create('course_schedule_exceptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_schedule_id')
                ->constrained('course_schedules')
                ->cascadeOnDelete();

            // The generated start date this row modifies (local date in the
            // schedule timezone, never UTC).
            $table->date('occurrence_date');

            // modified / cancelled / sold_out
            $table->string('status', 16)->default('modified');

            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->unsignedSmallInteger('duration_days')->nullable();
            $table->decimal('price', 10, 2)->nullable();
            $table->decimal('original_price', 10, 2)->nullable();
            $table->unsignedInteger('seats_total')->nullable();
            $table->string('trainer_name_en', 255)->nullable();
            $table->string('trainer_name_ar', 255)->nullable();
            $table->string('trainer_photo', 2048)->nullable();
            $table->string('note_en', 255)->nullable();
            $table->string('note_ar', 255)->nullable();

            $table->timestamps();

            $table->unique(['course_schedule_id', 'occurrence_date'], 'schedule_exception_date_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_schedule_exceptions');
    }
};
