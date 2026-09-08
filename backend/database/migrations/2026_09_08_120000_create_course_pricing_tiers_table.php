<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_pricing_tiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->string('mode', 32);
            $table->decimal('price', 10, 2)->default(0);
            $table->decimal('original_price', 10, 2)->nullable();
            $table->unsignedInteger('duration_hours')->default(0);
            $table->string('badge_text_en', 255)->nullable();
            $table->string('badge_text_ar', 255)->nullable();
            $table->json('features_en')->nullable();
            $table->json('features_ar')->nullable();
            $table->string('guarantee_title_en', 255)->nullable();
            $table->string('guarantee_title_ar', 255)->nullable();
            $table->text('guarantee_text_en')->nullable();
            $table->text('guarantee_text_ar')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['course_id', 'mode']);
            $table->index(['course_id', 'sort_order']);
        });

        // Backfill from legacy catalog_modes JSON when present.
        $courses = DB::table('courses')->select('id', 'catalog_modes', 'available_modes')->get();

        foreach ($courses as $course) {
            $modes = json_decode($course->catalog_modes ?? '[]', true);
            if (! is_array($modes) || $modes === []) {
                continue;
            }

            $sort = 0;
            foreach ($modes as $mode => $data) {
                if (! is_string($mode) || ! is_array($data)) {
                    continue;
                }

                $hours = 0;
                $durationEn = (string) ($data['duration_en'] ?? '');
                if (preg_match('/(\d+(?:\.\d+)?)/', $durationEn, $match)) {
                    $hours = (int) round((float) $match[1]);
                }

                DB::table('course_pricing_tiers')->insert([
                    'course_id' => $course->id,
                    'mode' => $mode,
                    'price' => (float) ($data['price'] ?? 0),
                    'original_price' => isset($data['original_price']) ? (float) $data['original_price'] : null,
                    'duration_hours' => $hours,
                    'badge_text_en' => null,
                    'badge_text_ar' => null,
                    'features_en' => json_encode(array_values($data['features_en'] ?? [])),
                    'features_ar' => json_encode(array_values($data['features_ar'] ?? [])),
                    'guarantee_title_en' => null,
                    'guarantee_title_ar' => null,
                    'guarantee_text_en' => null,
                    'guarantee_text_ar' => null,
                    'sort_order' => $sort++,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('course_pricing_tiers');
    }
};
