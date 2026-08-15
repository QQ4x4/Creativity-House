<?php

namespace App\Http\Resources;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Order
 *
 * `order_id` exposes the human reference, never the auto-increment primary key.
 * `invoice_url` points at the authenticated download route — the stored
 * `invoice_path` is internal and never leaves the server.
 */
class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'order_id' => $this->reference,
            'course_id' => $this->course_id,
            'course_title' => $this->whenLoaded('course', fn () => $this->course->title, ''),
            'amount' => (float) $this->amount,
            'currency' => $this->currency,
            'purchased_at' => ($this->paid_at ?? $this->created_at)?->toISOString(),
            'status' => $this->payment_status->value,
            'invoice_url' => filled($this->invoice_path)
                ? route('api.v1.orders.invoice', ['order' => $this->reference])
                : null,
        ];
    }
}
