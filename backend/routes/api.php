<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\PasswordResetController;
use App\Http\Controllers\Api\Student\CourseController;
use App\Http\Controllers\Api\Student\OrderController;
use App\Http\Controllers\Api\Student\ProfileController;
use App\Http\Controllers\Api\Student\ProgressController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Prefixed with /api. Auth mutation endpoints are throttled aggressively.
|
*/

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'app' => config('app.name'),
        'timestamp' => now()->toISOString(),
    ]);
});

Route::prefix('auth')->group(function () {
    Route::middleware('throttle:5,1')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
        Route::post('/resend-otp', [AuthController::class, 'resendOtp']);
        Route::post('/forgot-password', [PasswordResetController::class, 'forgot']);
        Route::post('/reset-password', [PasswordResetController::class, 'reset']);
    });

    Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

/*
|--------------------------------------------------------------------------
| Student Portal (Phase 3)
|--------------------------------------------------------------------------
|
| Registered twice on purpose:
|   • /api/v1/*      — the canonical, versioned surface.
|   • /api/student/* — the paths the deployed Next.js client already calls
|                      (frontend/lib/student/endpoints.js). Same controllers,
|                      so there is one implementation and zero frontend churn.
|
| Each group gets its own name prefix so route names stay unique, and
| `api.v1.*` is what OrderResource uses to build invoice links.
|
*/

$studentRoutes = function (): void {
    // ─── Profile ────────────────────────────────────────────────────────────
    Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');

    Route::match(['put', 'patch'], '/profile', [ProfileController::class, 'update'])
        ->name('profile.update');

    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar'])
        ->middleware('throttle:20,1')
        ->name('profile.avatar');

    Route::match(['put', 'patch'], '/profile/password', [ProfileController::class, 'updatePassword'])
        ->middleware('throttle:10,1')
        ->name('profile.password');

    Route::match(['put', 'patch'], '/profile/notifications', [ProfileController::class, 'updateNotifications'])
        ->name('profile.notifications');

    // ─── Purchase history ───────────────────────────────────────────────────
    Route::get('/orders', [OrderController::class, 'index'])->name('orders.index');

    // {order} is the public reference (CH-2026-0104), never the primary key.
    Route::get('/orders/{order}/invoice', [OrderController::class, 'invoice'])
        ->name('orders.invoice');

    // ─── Courses ────────────────────────────────────────────────────────────
    Route::get('/my-courses', [CourseController::class, 'index'])->name('my-courses.index');

    // Alias used by the frontend course API.
    Route::get('/courses', [CourseController::class, 'index'])->name('courses.index');

    Route::get('/courses/{course}', [CourseController::class, 'show'])->name('courses.show');

    Route::get('/courses/{course}/lessons', [CourseController::class, 'lessons'])
        ->name('courses.lessons');

    // Alias: the frontend calls this "curriculum".
    Route::get('/courses/{course}/curriculum', [CourseController::class, 'lessons'])
        ->name('courses.curriculum');

    Route::get('/courses/{course}/progress', [CourseController::class, 'progress'])
        ->name('courses.progress');

    // ─── Progress ───────────────────────────────────────────────────────────
    Route::post('/progress/complete-lesson', [ProgressController::class, 'store'])
        ->name('progress.complete');

    Route::delete('/progress/complete-lesson', [ProgressController::class, 'destroy'])
        ->name('progress.uncomplete');

    // Resourceful equivalents (what the learning screen calls).
    Route::post('/courses/{course}/lessons/{lesson}/complete', [ProgressController::class, 'store'])
        ->name('lessons.complete');

    Route::delete('/courses/{course}/lessons/{lesson}/complete', [ProgressController::class, 'destroy'])
        ->name('lessons.uncomplete');
};

Route::middleware(['auth:sanctum', 'throttle:120,1'])->group(function () use ($studentRoutes) {
    Route::prefix('v1')->name('api.v1.')->group($studentRoutes);

    Route::prefix('student')->name('api.student.')->group($studentRoutes);
});
