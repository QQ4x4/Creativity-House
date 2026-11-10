<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('success_stories_page', function (Blueprint $table) {
            $table->id();
            $table->string('hero_title_en')->nullable();
            $table->string('hero_title_ar')->nullable();
            $table->text('hero_subtitle_en')->nullable();
            $table->text('hero_subtitle_ar')->nullable();
            $table->string('cta_title_en')->nullable();
            $table->string('cta_title_ar')->nullable();
            $table->string('cta_button_en')->nullable();
            $table->string('cta_button_ar')->nullable();
            $table->string('cta_link')->default('/courses');
            $table->timestamps();
        });

        DB::table('success_stories_page')->insert([
            'hero_title_en' => 'Success Stories',
            'hero_title_ar' => 'قصص النجاح',
            'hero_subtitle_en' => 'Hear from professionals who advanced their careers through our accredited training.',
            'hero_subtitle_ar' => 'استمع إلى محترفين طوّروا مسيرتهم المهنية عبر برامجنا التدريبية المعتمدة.',
            'cta_title_en' => 'Ready to write your own success story?',
            'cta_title_ar' => 'جاهز لكتابة قصة نجاحك؟',
            'cta_button_en' => 'Explore courses',
            'cta_button_ar' => 'استكشف الدورات',
            'cta_link' => '/courses',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('success_stories_page');
    }
};
