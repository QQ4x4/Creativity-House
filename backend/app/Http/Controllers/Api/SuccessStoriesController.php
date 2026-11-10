<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminSuccessStoriesPageResource;
use App\Http\Resources\PublicTestimonialResource;
use App\Models\SuccessStoriesPage;
use App\Models\Testimonial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SuccessStoriesController extends Controller
{
    /**
     * GET /api/v1/success-stories
     *
     * Public payload: page settings + featured + published list (position order).
     * Optional ?course=slug|id filter. Optional ?lang=en|ar for localized fields.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $courseFilter = $request->query('course');

        $query = Testimonial::query()
            ->with('course:id,title,title_en,title_ar,slug')
            ->where('is_published', true)
            ->orderBy('position')
            ->orderBy('id');

        if (filled($courseFilter)) {
            $query->whereHas('course', function ($q) use ($courseFilter) {
                if (ctype_digit((string) $courseFilter)) {
                    $q->where('id', (int) $courseFilter);
                } else {
                    $q->where('slug', (string) $courseFilter);
                }
            });
        }

        $items = $query->get();
        $featured = $items->firstWhere('is_featured', true);

        // When filtering by course, featured may be outside the filter — still
        // prefer an in-list featured, else leave null for the grid-only view.
        if ($featured === null && ! filled($courseFilter)) {
            $featured = Testimonial::query()
                ->with('course:id,title,title_en,title_ar,slug')
                ->where('is_published', true)
                ->where('is_featured', true)
                ->first();
        }

        $page = SuccessStoriesPage::current();

        return response()->json([
            'data' => [
                'page' => (new AdminSuccessStoriesPageResource($page))->resolve($request),
                'featured' => $featured
                    ? (new PublicTestimonialResource($featured))->resolve($request)
                    : null,
                'testimonials' => PublicTestimonialResource::collection($items)->resolve($request),
            ],
        ]);
    }
}
