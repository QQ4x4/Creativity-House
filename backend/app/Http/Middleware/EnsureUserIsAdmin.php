<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards /api/v1/admin/*. Runs after auth:sanctum, so an unauthenticated
 * request is already a 401 by the time it reaches here.
 */
class EnsureUserIsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        abort_unless($user !== null && $user->isAdmin(), 403, 'Administrator access required.');

        return $next($request);
    }
}
