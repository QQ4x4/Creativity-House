<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveSuccessStoriesPageRequest;
use App\Http\Resources\Admin\AdminSuccessStoriesPageResource;
use App\Models\SuccessStoriesPage;
use Illuminate\Http\JsonResponse;

class SuccessStoriesPageController extends Controller
{
    public function show(): JsonResponse
    {
        return AdminSuccessStoriesPageResource::make(SuccessStoriesPage::current())->response();
    }

    public function update(SaveSuccessStoriesPageRequest $request): JsonResponse
    {
        $page = SuccessStoriesPage::current();
        $page->fill($request->validated());
        if (! filled($page->cta_link)) {
            $page->cta_link = '/courses';
        }
        $page->save();

        return AdminSuccessStoriesPageResource::make($page->fresh())->response();
    }
}
