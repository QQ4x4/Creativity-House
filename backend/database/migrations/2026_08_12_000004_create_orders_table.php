<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();

            // Human-facing reference shown in purchase history (e.g. CH-2026-0104).
            // The auto-increment id is never exposed by OrderResource.
            $table->string('reference', 40)->unique();

            $table->decimal('amount', 10, 2)->default(0);
            $table->char('currency', 3)->default('USD');

            // Cast to App\Enums\PaymentStatus. Kept as a string (not MySQL enum) so
            // new statuses don't require an ALTER on a growing table.
            $table->string('payment_status', 20)->default('pending');

            $table->string('invoice_path', 2048)->nullable();
            $table->timestamp('paid_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // A paid order IS the enrollment record — this index backs every
            // enrollment check and the purchase-history listing.
            $table->index(['user_id', 'payment_status']);
            $table->index(['user_id', 'course_id', 'payment_status'], 'orders_enrollment_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
