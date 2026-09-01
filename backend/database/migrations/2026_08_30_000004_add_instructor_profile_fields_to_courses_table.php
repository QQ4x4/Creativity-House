<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The public course page renders an instructor title, an Arabic name, and the
 * "trained / countries" stat pair. Those were hardcoded in the Next.js catalog
 * constants; these columns move them into the database so the admin owns them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            if (! Schema::hasColumn('courses', 'instructor_name_ar')) {
                $table->string('instructor_name_ar', 150)->nullable()->after('instructor_name');
            }

            if (! Schema::hasColumn('courses', 'instructor_title_en')) {
                $table->string('instructor_title_en', 200)->nullable()->after('instructor_name_ar');
            }

            if (! Schema::hasColumn('courses', 'instructor_title_ar')) {
                $table->string('instructor_title_ar', 200)->nullable()->after('instructor_title_en');
            }

            if (! Schema::hasColumn('courses', 'instructor_trained')) {
                $table->string('instructor_trained', 40)->nullable()->after('instructor_credentials');
            }

            if (! Schema::hasColumn('courses', 'instructor_countries')) {
                $table->unsignedInteger('instructor_countries')->nullable()->after('instructor_trained');
            }
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn([
                'instructor_name_ar',
                'instructor_title_en',
                'instructor_title_ar',
                'instructor_trained',
                'instructor_countries',
            ]);
        });
    }
};
