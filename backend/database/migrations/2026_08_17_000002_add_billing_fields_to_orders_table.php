<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('billing_first_name', 50)->nullable()->after('paid_at');
            $table->string('billing_last_name', 50)->nullable()->after('billing_first_name');
            $table->string('billing_email', 50)->nullable()->after('billing_last_name');
            $table->string('billing_phone', 50)->nullable()->after('billing_email');
            $table->char('billing_country', 2)->nullable()->after('billing_phone');
            $table->string('delivery_mode', 32)->nullable()->after('billing_country');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'billing_first_name',
                'billing_last_name',
                'billing_email',
                'billing_phone',
                'billing_country',
                'delivery_mode',
            ]);
        });
    }
};
