<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\User;
use App\Services\Student\OrderService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OrderController extends Controller
{
    public function __construct(private readonly OrderService $orders) {}

    /**
     * GET /orders — purchase history for the authenticated student.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return OrderResource::collection($this->orders->history($this->user($request)));
    }

    /**
     * GET /orders/{order}/invoice — streams the PDF.
     *
     * `{order}` is the public reference (CH-2026-0104), resolved against the
     * caller's own orders only.
     */
    public function invoice(Request $request, string $order): StreamedResponse
    {
        return $this->orders->downloadInvoice(
            $this->orders->findForUser($this->user($request), $order)
        );
    }

    private function user(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();

        return $user;
    }
}
