<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('course_schedules')) {
            return;
        }

        Schema::create('course_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();

            // null = this batch is offered for every delivery mode.
            $table->string('delivery_mode', 32)->nullable();

            $table->string('title_en', 255)->nullable();
            $table->string('title_ar', 255)->nullable();
            $table->string('batch_label_en', 120)->nullable();
            $table->string('batch_label_ar', 120)->nullable();

            // null = derived from start_time (see CourseSchedule::resolveTimeSlot).
            $table->string('time_slot', 16)->nullable();
            $table->string('format', 16)->default('online');
            $table->string('location_en', 255)->nullable();
            $table->string('location_ar', 255)->nullable();

            // IANA zone. start_time / end_time are local wall times in this zone.
            $table->string('timezone', 64)->default('Asia/Kuala_Lumpur');
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedSmallInteger('duration_days')->default(1);

            // once / custom_dates / weekly / monthly_days
            $table->string('recurrence_type', 24)->default('once');
            $table->date('starts_on');
            $table->json('custom_dates')->nullable();
            $table->boolean('repeat_custom_monthly')->default(false);
            $table->json('weekdays')->nullable();
            // `interval` is reserved in MySQL — the column is repeat_interval.
            $table->unsignedSmallInteger('repeat_interval')->default(1);
            $table->json('month_days')->nullable();
            $table->string('missing_day_policy', 16)->default('skip');

            // never / on_date / after_count
            $table->string('ends_type', 16)->default('never');
            $table->date('ends_on')->nullable();
            $table->unsignedSmallInteger('max_occurrences')->nullable();

            // null price falls back to the course price for delivery_mode.
            $table->decimal('price', 10, 2)->nullable();
            $table->decimal('original_price', 10, 2)->nullable();
            $table->string('promo_text_en', 255)->nullable();
            $table->string('promo_text_ar', 255)->nullable();

            $table->unsignedInteger('seats_total')->nullable();
            $table->boolean('show_seats_left')->default(false);
            $table->unsignedSmallInteger('enrollment_closes_hours')->default(0);

            // enroll (checkout) / inquiry (course-inquiry form)
            $table->string('cta_type', 16)->default('enroll');

            $table->string('trainer_name_en', 255)->nullable();
            $table->string('trainer_name_ar', 255)->nullable();
            $table->string('trainer_title_en', 255)->nullable();
            $table->string('trainer_title_ar', 255)->nullable();
            $table->string('trainer_photo', 2048)->nullable();

            $table->boolean('show_countdown')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            $table->text('notes_en')->nullable();
            $table->text('notes_ar')->nullable();
            $table->unsignedInteger('sort_order')->default(0);

            $table->timestamps();
            $table->softDeletes();

            $table->index(['course_id', 'is_active']);
            $table->index(['course_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_schedules');
    }
};
