<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('account_status', 32)
                ->default('active')
                ->after('is_active');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('stripe_payment_intent_id', 255)
                ->nullable()
                ->unique()
                ->after('stripe_session_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique(['stripe_payment_intent_id']);
            $table->dropColumn('stripe_payment_intent_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('account_status');
        });
    }
};
