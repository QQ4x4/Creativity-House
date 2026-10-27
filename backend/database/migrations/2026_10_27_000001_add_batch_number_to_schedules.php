<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Numeric batch identifiers for public cards. Legacy batch_label_* columns stay
 * in place (no destructive change) but are no longer used by the UI/API.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_schedules', function (Blueprint $table) {
            $table->unsignedInteger('batch_number')->nullable()->after('batch_label_ar');
        });

        Schema::table('course_schedule_exceptions', function (Blueprint $table) {
            $table->unsignedInteger('batch_number')->nullable()->after('seats_total');
        });
    }

    public function down(): void
    {
        Schema::table('course_schedules', function (Blueprint $table) {
            $table->dropColumn('batch_number');
        });

        Schema::table('course_schedule_exceptions', function (Blueprint $table) {
            $table->dropColumn('batch_number');
        });
    }
};
