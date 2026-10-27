<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('orders', 'course_schedule_id')) {
            return;
        }

        Schema::table('orders', function (Blueprint $table) {
            // nullOnDelete: a deleted schedule must never delete a paid order.
            $table->foreignId('course_schedule_id')
                ->nullable()
                ->after('delivery_mode')
                ->constrained('course_schedules')
                ->nullOnDelete();

            $table->date('schedule_occurrence_date')->nullable()->after('course_schedule_id');
            // UTC snapshot of the batch start, so reporting survives rule edits.
            $table->dateTime('schedule_starts_at')->nullable()->after('schedule_occurrence_date');

            $table->index(['course_schedule_id', 'schedule_occurrence_date'], 'orders_schedule_occurrence_index');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('orders', 'course_schedule_id')) {
            return;
        }

        Schema::table('orders', function (Blueprint $table) {
            // MySQL may be using the composite index for the FK, so the FK
            // must go first — otherwise DROP INDEX fails with error 1553.
            $table->dropForeign(['course_schedule_id']);
            $table->dropIndex('orders_schedule_occurrence_index');
            $table->dropColumn([
                'course_schedule_id',
                'schedule_occurrence_date',
                'schedule_starts_at',
            ]);
        });
    }
};
