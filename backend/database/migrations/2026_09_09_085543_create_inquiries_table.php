<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inquiries', function (Blueprint $table) {
            $table->id();
            $table->string('type', 32); // user | organization
            $table->string('full_name');
            $table->string('email');
            $table->string('phone_number')->nullable();
            $table->string('company_name')->nullable();
            $table->string('target_course')->nullable();
            $table->text('message');
            $table->string('status', 32)->default('unread'); // unread | read | replied
            $table->timestamp('replied_at')->nullable();
            $table->timestamps();

            $table->index(['type', 'status']);
            $table->index('email');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inquiries');
    }
};
