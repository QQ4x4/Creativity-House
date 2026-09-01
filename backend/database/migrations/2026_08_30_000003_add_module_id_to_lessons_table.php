<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Promotes the free-text `lessons.module_name` grouping label into a real
 * `modules` table so the admin editor has a single source of truth.
 *
 * `module_name` is intentionally kept and mirrored from the module title:
 * LessonResource still derives its client grouping key from it, so dropping the
 * column here would break the student player sidebar.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            if (! Schema::hasColumn('lessons', 'module_id')) {
                $table->foreignId('module_id')
                    ->nullable()
                    ->after('course_id')
                    ->constrained('modules')
                    ->nullOnDelete();
            }
        });

        $this->backfillModules();
    }

    public function down(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            if (Schema::hasColumn('lessons', 'module_id')) {
                $table->dropConstrainedForeignId('module_id');
            }
        });
    }

    /**
     * Rebuild one module row per distinct `module_name` per course, preserving
     * the order lessons already appear in.
     */
    private function backfillModules(): void
    {
        $now = now();

        DB::table('lessons')
            ->select('course_id')
            ->distinct()
            ->orderBy('course_id')
            ->pluck('course_id')
            ->each(function ($courseId) use ($now): void {
                $lessons = DB::table('lessons')
                    ->where('course_id', $courseId)
                    ->whereNull('deleted_at')
                    ->orderBy('sort_order')
                    ->orderBy('id')
                    ->get(['id', 'module_name']);

                $moduleIds = [];
                $sortOrder = 0;

                foreach ($lessons as $lesson) {
                    $title = trim((string) $lesson->module_name);

                    if ($title === '') {
                        $title = 'Module 1';
                    }

                    if (! array_key_exists($title, $moduleIds)) {
                        $moduleIds[$title] = DB::table('modules')->insertGetId([
                            'course_id' => $courseId,
                            'title_en' => mb_substr($title, 0, 200),
                            'title_ar' => null,
                            'sort_order' => $sortOrder++,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                    }

                    DB::table('lessons')
                        ->where('id', $lesson->id)
                        ->update(['module_id' => $moduleIds[$title]]);
                }
            });
    }
};
