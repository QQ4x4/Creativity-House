<?php

namespace App\Services\Student;

use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Purchase history and invoice delivery.
 *
 * Invoices live on the private disk and are streamed through an authenticated
 * route — the stored path is never exposed, so invoice URLs can't be guessed.
 */
class OrderService
{
    private const INVOICE_DISK = 'local';

    /**
     * Newest-first purchase history with the course eager-loaded for the title.
     *
     * @return EloquentCollection<int, Order>
     */
    public function history(User $user): EloquentCollection
    {
        /** @var EloquentCollection<int, Order> $orders */
        $orders = Order::query()
            ->where('user_id', $user->id)
            ->with(['course:id,title,slug'])
            ->orderByDesc('paid_at')
            ->orderByDesc('created_at')
            ->get();

        return $orders;
    }

    /**
     * Resolve one of the student's own orders by its public reference.
     * Scoping by user_id is what prevents reading someone else's invoice.
     */
    public function findForUser(User $user, string $reference): Order
    {
        /** @var Order|null $order */
        $order = Order::query()
            ->where('user_id', $user->id)
            ->where('reference', $reference)
            ->with(['course:id,title'])
            ->first();

        if ($order === null) {
            throw new NotFoundHttpException('Order not found.');
        }

        return $order;
    }

    /**
     * Stream the invoice PDF. A 404 here is meaningful: the frontend falls back to
     * its own print-ready preview when no stored invoice exists yet.
     */
    public function downloadInvoice(Order $order): StreamedResponse
    {
        $path = $order->invoice_path;
        $disk = Storage::disk(self::INVOICE_DISK);

        if (blank($path) || ! $disk->exists($path)) {
            throw new NotFoundHttpException('No invoice is available for this order.');
        }

        return $disk->download($path, sprintf('invoice-%s.pdf', $order->reference), [
            'Content-Type' => 'application/pdf',
        ]);
    }
}
