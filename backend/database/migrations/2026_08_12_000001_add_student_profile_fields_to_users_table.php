<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 3 — Student Portal profile fields.
 *
 * NOTE: no `phone` column is added. `phone_number` already exists (added by
 * 2026_07_28_000001_update_users_table_for_auth) and is what the auth flow and
 * the Next.js client already read/write. A second phone column would split the
 * source of truth.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Stores a relative disk path (e.g. avatars/ab12.webp) OR an absolute
            // URL for Google-sourced avatars. UserResource resolves both.
            $table->string('avatar_url', 2048)->nullable()->after('phone_number');

            $table->json('notification_preferences')->nullable()->after('avatar_url');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['avatar_url', 'notification_preferences']);
        });
    }
};
