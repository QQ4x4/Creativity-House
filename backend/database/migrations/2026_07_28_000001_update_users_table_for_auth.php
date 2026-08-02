<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name', 50)->nullable()->after('id');
            $table->string('last_name', 50)->nullable()->after('first_name');
            $table->string('phone_number', 50)->nullable()->after('email');
            $table->string('google_id')->nullable()->unique()->after('phone_number');
            $table->string('verification_code')->nullable()->after('password');
            $table->timestamp('code_expires_at')->nullable()->after('verification_code');
            $table->boolean('is_active')->default(true)->after('code_expires_at');
        });

        // Backfill name parts from legacy `name` for existing rows.
        DB::table('users')
            ->whereNull('first_name')
            ->orderBy('id')
            ->chunkById(100, function ($users): void {
                foreach ($users as $user) {
                    $parts = preg_split('/\s+/', trim((string) $user->name), 2) ?: [];

                    DB::table('users')->where('id', $user->id)->update([
                        'first_name' => mb_substr($parts[0] ?? 'User', 0, 50),
                        'last_name' => mb_substr($parts[1] ?? 'Account', 0, 50),
                    ]);
                }
            });

        // Enforce NOT NULL after backfill (MySQL-safe without doctrine/dbal change()).
        DB::statement('ALTER TABLE users MODIFY first_name VARCHAR(50) NOT NULL');
        DB::statement('ALTER TABLE users MODIFY last_name VARCHAR(50) NOT NULL');
        DB::statement('ALTER TABLE users MODIFY email VARCHAR(50) NOT NULL');
        DB::statement('ALTER TABLE users MODIFY password VARCHAR(255) NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE users MODIFY password VARCHAR(255) NOT NULL');
        DB::statement('ALTER TABLE users MODIFY email VARCHAR(255) NOT NULL');

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['google_id']);
            $table->dropColumn([
                'first_name',
                'last_name',
                'phone_number',
                'google_id',
                'verification_code',
                'code_expires_at',
                'is_active',
            ]);
        });
    }
};
