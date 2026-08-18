<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organization_inquiries', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('company_name');
            $table->string('email');
            $table->string('phone');
            $table->foreignId('course_id')->nullable()->constrained('courses')->nullOnDelete();
            $table->text('message');
            $table->string('status', 32)->default('pending');
            $table->timestamps();

            $table->index('status');
            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_inquiries');
    }
};
