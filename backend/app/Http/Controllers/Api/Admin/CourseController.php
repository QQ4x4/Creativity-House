<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCourseRequest;
use App\Http\Requests\Admin\UpdateCourseRequest;
use App\Http\Resources\Admin\AdminCourseResource;
use App\Models\Course;
use App\Services\Admin\CurriculumService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class CourseController extends Controller
{
    public function __construct(
        private readonly CurriculumService $curriculum,
    ) {}

    /**
     * GET /api/v1/admin/courses — picker list for the admin dashboard.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $search = trim((string) $request->query('search', ''));

        $courses = Course::query()
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($inner) use ($search): void {
                    $inner->where('title', 'like', "%{$search}%")
                        ->orWhere('title_en', 'like', "%{$search}%")
                        ->orWhere('slug', 'like', "%{$search}%");
                });
            })
            ->withCount(['lessons', 'modules'])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->paginate(min((int) $request->query('per_page', 25), 100));

        return AdminCourseResource::collection($courses);
    }

    /**
     * POST /api/v1/admin/courses — create a blank course shell for the editor.
     */
    public function store(StoreCourseRequest $request): JsonResponse
    {
        $payload = $request->payload();

        $payload['slug'] = $this->resolveUniqueSlug(
            (string) ($payload['slug'] ?? ''),
            (string) $payload['title_en']
        );

        // Legacy columns still read by the student portal and receipts.
        $payload['title'] = $payload['title_en'];
        $payload['description'] = $payload['description_en'] ?? null;

        $payload['currency'] = strtoupper((string) ($payload['currency'] ?? 'USD'));
        $payload['is_published'] = (bool) ($payload['is_published'] ?? false);
        $payload['is_public'] = (bool) ($payload['is_public'] ?? false);
        $payload['sort_order'] = (int) ($payload['sort_order'] ?? ((int) Course::query()->max('sort_order')) + 1);

        $payload['target_audience'] = $payload['target_audience'] ?? ['en' => [], 'ar' => []];
        $payload['learning_outcomes'] = $payload['learning_outcomes'] ?? ['en' => [], 'ar' => []];
        $payload['instructor_credentials'] = $payload['instructor_credentials'] ?? ['en' => [], 'ar' => []];
        $payload['available_modes'] = $payload['available_modes'] ?? [];
        $payload['catalog_modes'] = $payload['catalog_modes'] ?? [];
        $payload['seo_keywords'] = $payload['seo_keywords'] ?? [];

        $course = Course::query()->create($payload);
        $course->setRelation('modules', collect());

        return (new AdminCourseResource($course))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * GET /api/v1/admin/courses/{course} — full hydration payload for the editor.
     */
    public function show(Course $course): AdminCourseResource
    {
        $course->setRelation('modules', $this->curriculum->tree($course));

        return new AdminCourseResource($course);
    }

    /**
     * PATCH /api/v1/admin/courses/{course}
     *
     * Only the validated keys the client actually sent are applied, so saving
     * one tab never nulls out fields owned by another.
     */
    public function update(UpdateCourseRequest $request, Course $course): AdminCourseResource
    {
        $payload = $request->payload();

        // `title` is the legacy non-localized column still read by the student
        // portal and order receipts; keep it aligned with the English title.
        if (array_key_exists('title_en', $payload)) {
            $payload['title'] = $payload['title_en'];
        }

        if (array_key_exists('description_en', $payload)) {
            $payload['description'] = $payload['description_en'];
        }

        $course->fill($payload)->save();

        $course->refresh()->setRelation('modules', $this->curriculum->tree($course));

        return new AdminCourseResource($course);
    }

    /**
     * Derive a URL-safe slug from the English title when the admin leaves slug blank,
     * then suffix -2, -3, … until unique (including soft-deleted rows).
     */
    private function resolveUniqueSlug(string $slug, string $titleEn): string
    {
        $base = trim($slug) !== '' ? trim($slug) : Str::slug($titleEn);
        $base = $base !== '' ? $base : 'course';

        $candidate = $base;
        $suffix = 2;

        while (Course::withTrashed()->where('slug', $candidate)->exists()) {
            $candidate = $base.'-'.$suffix++;
        }

        return $candidate;
    }
}
