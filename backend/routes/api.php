<?php

use App\Http\Controllers\Api\Admin\BunnyController;
use App\Http\Controllers\Api\Admin\CourseController as AdminCourseController;
use App\Http\Controllers\Api\Admin\CurriculumController;
use App\Http\Controllers\Api\Admin\LessonController as AdminLessonController;
use App\Http\Controllers\Api\Admin\ModuleController as AdminModuleController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\PasswordResetController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\CourseInquiryController;
use App\Http\Controllers\Api\OrganizationInquiryController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PublicCatalogController;
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
| Public course catalog
|--------------------------------------------------------------------------
|
| Unauthenticated. Do not nest these under /student or auth:sanctum —
| enrolled-only listings stay on /api/student/courses and /api/v1/courses.
|
*/
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/courses', [PublicCatalogController::class, 'index']);
    Route::get('/courses/{course}', [PublicCatalogController::class, 'show']);
});

/*
|--------------------------------------------------------------------------
| Stripe Checkout
|--------------------------------------------------------------------------
|
| Authenticated buyers receive a Stripe-hosted Checkout URL.
| The mock billing checkout remains on POST /api/checkout.
|
*/
Route::middleware(['auth:sanctum', 'throttle:20,1'])->group(function () {
    Route::post('/v1/checkout', [PaymentController::class, 'createCheckoutSession'])
        ->name('api.v1.checkout');
});

/*
|--------------------------------------------------------------------------
| Stripe webhooks (no auth, no CSRF — verified by Stripe-Signature)
|--------------------------------------------------------------------------
*/
Route::post('/v1/stripe/webhook', [PaymentController::class, 'webhook'])
    ->middleware('throttle:60,1')
    ->name('api.v1.stripe.webhook');

/*
|--------------------------------------------------------------------------
| Public checkout (mock payment — legacy billing payload)
|--------------------------------------------------------------------------
|
| Auth is optional. Guests are linked to a user row by email. Card PAN/CVC
| must never be posted here; the frontend sends billing + course only.
|
*/
Route::middleware('throttle:20,1')->group(function () {
    Route::post('/checkout', [CheckoutController::class, 'store'])->name('api.checkout');
});

/*
|--------------------------------------------------------------------------
| Public inquiries (B2B organizations + individual course questions)
|--------------------------------------------------------------------------
|
| Unauthenticated lead capture. Strict FormRequest validation + throttle.
|
*/
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/v1/organization-inquiries', [OrganizationInquiryController::class, 'store'])
        ->name('api.v1.organization-inquiries.store');
    Route::post('/v1/course-inquiries', [CourseInquiryController::class, 'store'])
        ->name('api.v1.course-inquiries.store');
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

/*
|--------------------------------------------------------------------------
| Admin course management
|--------------------------------------------------------------------------
|
| auth:sanctum → `admin` (users.is_admin). Consumed by the Next.js editor at
| /[lang]/admin/courses/[id]/edit via frontend/lib/admin/api.ts.
|
| scopeBindings() forces {module} and {lesson} to resolve through {course},
| so an id belonging to another course 404s instead of being edited.
|
*/
Route::middleware(['auth:sanctum', 'admin', 'throttle:120,1'])
    ->prefix('v1/admin')
    ->name('api.v1.admin.')
    ->scopeBindings()
    ->group(function (): void {
        Route::get('/bunny/videos', [BunnyController::class, 'videos'])->name('bunny.videos');

        Route::get('/courses', [AdminCourseController::class, 'index'])->name('courses.index');
        Route::post('/courses', [AdminCourseController::class, 'store'])->name('courses.store');
        Route::get('/courses/{course}', [AdminCourseController::class, 'show'])->name('courses.show');
        Route::match(['put', 'patch'], '/courses/{course}', [AdminCourseController::class, 'update'])
            ->name('courses.update');

        Route::get('/courses/{course}/curriculum', [CurriculumController::class, 'show'])
            ->name('curriculum.show');
        Route::put('/courses/{course}/curriculum', [CurriculumController::class, 'sync'])
            ->name('curriculum.sync');

        Route::post('/courses/{course}/modules', [AdminModuleController::class, 'store'])
            ->name('modules.store');
        Route::match(['put', 'patch'], '/courses/{course}/modules/{module}', [AdminModuleController::class, 'update'])
            ->name('modules.update');
        Route::delete('/courses/{course}/modules/{module}', [AdminModuleController::class, 'destroy'])
            ->name('modules.destroy');

        Route::post('/courses/{course}/modules/{module}/lessons', [AdminLessonController::class, 'store'])
            ->name('lessons.store');
        Route::match(['put', 'patch'], '/courses/{course}/lessons/{lesson}', [AdminLessonController::class, 'update'])
            ->name('lessons.update');
        Route::delete('/courses/{course}/lessons/{lesson}', [AdminLessonController::class, 'destroy'])
            ->name('lessons.destroy');
    });
