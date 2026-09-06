<?php

use App\Models\Lesson;
use App\Models\Module;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Introduce SubModule (chapter) between Module and Lesson.
 *
 * Existing lessons are preserved: each module that already has lessons gets a
 * default sub-module, and those lessons are re-pointed at it before the FK
 * cascade is applied.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sub_modules', function (Blueprint $table) {
            $table->id();

            $table->foreignId('module_id')->constrained('modules')->cascadeOnDelete();

            $table->string('title_en', 200);
            $table->string('title_ar', 200)->nullable();
            $table->unsignedInteger('sort_order')->default(0);

            $table->timestamps();
            $table->softDeletes();

            $table->index(['module_id', 'sort_order']);
        });

        Schema::table('lessons', function (Blueprint $table) {
            $table->foreignId('sub_module_id')
                ->nullable()
                ->after('module_id')
                ->constrained('sub_modules')
                ->nullOnDelete();
        });

        $this->backfillDefaultSubModules();

        // Now that every existing lesson is linked, switch to cascade on delete.
        Schema::table('lessons', function (Blueprint $table) {
            $table->dropForeign(['sub_module_id']);
        });

        Schema::table('lessons', function (Blueprint $table) {
            $table->foreign('sub_module_id')
                ->references('id')
                ->on('sub_modules')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            $table->dropForeign(['sub_module_id']);
            $table->dropColumn('sub_module_id');
        });

        Schema::dropIfExists('sub_modules');
    }

    private function backfillDefaultSubModules(): void
    {
        Module::query()->withTrashed()->orderBy('id')->each(function (Module $module): void {
            $lessonQuery = Lesson::query()
                ->withTrashed()
                ->where('module_id', $module->id)
                ->whereNull('sub_module_id');

            if (! $lessonQuery->exists()) {
                return;
            }

            $subModuleId = DB::table('sub_modules')->insertGetId([
                'module_id' => $module->id,
                'title_en' => 'Default Section',
                'title_ar' => null,
                'sort_order' => 0,
                'created_at' => now(),
                'updated_at' => now(),
                'deleted_at' => $module->deleted_at,
            ]);

            Lesson::query()
                ->withTrashed()
                ->where('module_id', $module->id)
                ->whereNull('sub_module_id')
                ->update(['sub_module_id' => $subModuleId]);
        });
    }
};
