<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('ghl_contact_id')->nullable()->after('account_status');
            $table->boolean('marketing_opt_out')->default(false)->after('ghl_contact_id');
            $table->index('ghl_contact_id');
        });

        Schema::table('orders', function (Blueprint $table): void {
            $table->string('ghl_contact_id')->nullable()->after('stripe_payment_intent_id');
            $table->string('ghl_opportunity_id')->nullable()->after('ghl_contact_id');
            $table->index('ghl_contact_id');
            $table->index('ghl_opportunity_id');
        });

        Schema::create('ghl_sync_logs', function (Blueprint $table): void {
            $table->id();
            $table->string('entity_type', 64);
            $table->string('entity_id', 64)->nullable();
            $table->string('action', 64);
            $table->string('status', 32);
            $table->unsignedSmallInteger('http_status')->nullable();
            $table->string('ghl_id')->nullable();
            $table->text('error')->nullable();
            $table->unsignedSmallInteger('attempts')->default(1);
            $table->timestamps();

            $table->index(['entity_type', 'entity_id']);
            $table->index(['action', 'status']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ghl_sync_logs');

        Schema::table('orders', function (Blueprint $table): void {
            $table->dropIndex(['ghl_contact_id']);
            $table->dropIndex(['ghl_opportunity_id']);
            $table->dropColumn(['ghl_contact_id', 'ghl_opportunity_id']);
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex(['ghl_contact_id']);
            $table->dropColumn(['ghl_contact_id', 'marketing_opt_out']);
        });
    }
};
