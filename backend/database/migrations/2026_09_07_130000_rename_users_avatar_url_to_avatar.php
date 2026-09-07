<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Store relative disk paths in `avatar`; expose absolute URLs as `avatar_url`
 * via the User model accessor (no more path/URL collision on one column).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'avatar_url') || Schema::hasColumn('users', 'avatar')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('avatar_url', 'avatar');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('users', 'avatar') || Schema::hasColumn('users', 'avatar_url')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('avatar', 'avatar_url');
        });
    }
};
