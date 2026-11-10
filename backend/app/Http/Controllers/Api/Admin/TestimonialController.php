<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveTestimonialRequest;
use App\Http\Resources\Admin\AdminTestimonialResource;
use App\Models\Testimonial;
use App\Services\Bunny\BunnyStreamService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TestimonialController extends Controller
{
    public function __construct(private readonly BunnyStreamService $bunny) {}

    public function index(): JsonResponse
    {
        $rows = Testimonial::query()
            ->with('course:id,title,title_en,title_ar,slug')
            ->orderBy('position')
            ->orderBy('id')
            ->get();

        return AdminTestimonialResource::collection($rows)->response();
    }

    public function store(SaveTestimonialRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data = $this->enrichFromBunny($data);

        $maxPosition = (int) Testimonial::query()->max('position');
        $data['position'] = $maxPosition + 1;
        $data['is_published'] = (bool) ($data['is_published'] ?? false);
        $data['is_featured'] = (bool) ($data['is_featured'] ?? false);

        $testimonial = DB::transaction(function () use ($data) {
            $row = Testimonial::query()->create($data);

            if ($row->is_featured) {
                $row->markFeatured();
            }

            return $row->fresh(['course']);
        });

        return AdminTestimonialResource::make($testimonial)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Testimonial $testimonial): JsonResponse
    {
        $testimonial->load('course:id,title,title_en,title_ar,slug');

        return AdminTestimonialResource::make($testimonial)->response();
    }

    public function update(SaveTestimonialRequest $request, Testimonial $testimonial): JsonResponse
    {
        $data = $request->validated();

        if (array_key_exists('bunny_video_id', $data)
            && $data['bunny_video_id'] !== $testimonial->bunny_video_id) {
            $data = $this->enrichFromBunny($data, overwriteMeta: true);
        }

        $testimonial = DB::transaction(function () use ($testimonial, $data) {
            $testimonial->fill($data)->save();

            if (array_key_exists('is_featured', $data) && $testimonial->is_featured) {
                $testimonial->markFeatured();
            }

            return $testimonial->fresh(['course']);
        });

        return AdminTestimonialResource::make($testimonial)->response();
    }

    public function destroy(Testimonial $testimonial): Response
    {
        $testimonial->delete();

        return response()->noContent();
    }

    /**
     * PATCH /admin/testimonials/reorder  body: { ids: number[] }
     */
    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct', 'exists:testimonials,id'],
        ]);

        $ids = array_values(array_map('intval', $validated['ids']));

        DB::transaction(function () use ($ids) {
            foreach ($ids as $index => $id) {
                Testimonial::query()->whereKey($id)->update(['position' => $index + 1]);
            }
        });

        $rows = Testimonial::query()
            ->with('course:id,title,title_en,title_ar,slug')
            ->orderBy('position')
            ->orderBy('id')
            ->get();

        return AdminTestimonialResource::collection($rows)->response();
    }

    /**
     * PATCH /admin/testimonials/{testimonial}/feature
     */
    public function feature(Testimonial $testimonial): JsonResponse
    {
        $testimonial->markFeatured();

        return AdminTestimonialResource::make($testimonial->fresh(['course']))->response();
    }

    /**
     * PATCH /admin/testimonials/{testimonial}/publish  body: { is_published: bool }
     */
    public function publish(Request $request, Testimonial $testimonial): JsonResponse
    {
        $validated = $request->validate([
            'is_published' => ['required', 'boolean'],
        ]);

        $testimonial->forceFill(['is_published' => $validated['is_published']])->save();

        return AdminTestimonialResource::make($testimonial->fresh(['course']))->response();
    }

    /**
     * Merge Bunny metadata when creating / changing the video.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function enrichFromBunny(array $data, bool $overwriteMeta = false): array
    {
        $guid = (string) ($data['bunny_video_id'] ?? '');
        if ($guid === '') {
            throw ValidationException::withMessages([
                'bunny_video_id' => 'A Bunny video is required.',
            ]);
        }

        $video = $this->bunny->isConfigured() ? $this->bunny->video($guid) : null;

        if ($video === null) {
            // Allow offline/dev create when Bunny is unreachable — keep caller fields.
            $data['orientation'] = $data['orientation'] ?? 'landscape';
            $data['duration_seconds'] = (int) ($data['duration_seconds'] ?? 0);

            return $data;
        }

        if ($overwriteMeta || empty($data['video_title'])) {
            $data['video_title'] = $video['title'] ?? $data['video_title'] ?? null;
        }
        if ($overwriteMeta || ! array_key_exists('duration_seconds', $data) || $data['duration_seconds'] === null) {
            $data['duration_seconds'] = (int) ($video['duration'] ?? 0);
        }
        if ($overwriteMeta || empty($data['orientation'])) {
            $data['orientation'] = $video['orientation'] ?? 'landscape';
        }
        if ($overwriteMeta || empty($data['bunny_collection_id'])) {
            $data['bunny_collection_id'] = $video['collection_id'] ?? null;
        }

        return $data;
    }
}
