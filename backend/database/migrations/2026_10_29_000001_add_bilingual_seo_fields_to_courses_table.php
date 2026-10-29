<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->string('seo_title_en', 70)->nullable()->after('seo_description');
            $table->string('seo_title_ar', 70)->nullable()->after('seo_title_en');
            $table->string('seo_description_en', 170)->nullable()->after('seo_title_ar');
            $table->string('seo_description_ar', 170)->nullable()->after('seo_description_en');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn([
                'seo_title_en',
                'seo_title_ar',
                'seo_description_en',
                'seo_description_ar',
            ]);
        });
    }
};
