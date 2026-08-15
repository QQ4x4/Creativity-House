<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\UpdateAvatarRequest;
use App\Http\Requests\Student\UpdateNotificationPreferencesRequest;
use App\Http\Requests\Student\UpdatePasswordRequest;
use App\Http\Requests\Student\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Student\ProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function __construct(private readonly ProfileService $profile) {}

    public function show(Request $request): UserResource
    {
        return new UserResource($this->user($request));
    }

    public function update(UpdateProfileRequest $request): UserResource
    {
        $user = $this->profile->updateProfile(
            $this->user($request),
            $request->safe()->only(['first_name', 'last_name', 'email', 'phone_number']),
            $request->file('avatar'),
        );

        return new UserResource($user);
    }

    public function updateAvatar(UpdateAvatarRequest $request): JsonResponse
    {
        $user = $this->user($request);
        $avatarUrl = $this->profile->updateAvatar($user, $request->file('avatar'));

        return response()->json([
            'success' => true,
            'avatar_url' => $avatarUrl,
            'user' => new UserResource($user->refresh()),
        ]);
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $this->profile->updatePassword(
            $this->user($request),
            $request->string('password')->toString(),
        );

        return response()->json([
            'success' => true,
            'message' => 'Password updated successfully.',
        ]);
    }

    public function updateNotifications(UpdateNotificationPreferencesRequest $request): JsonResponse
    {
        $preferences = $this->profile->updateNotificationPreferences(
            $this->user($request),
            $request->preferences(),
        );

        return response()->json([
            'success' => true,
            'notification_preferences' => $preferences,
        ]);
    }

    /**
     * `auth:sanctum` guarantees a user; this only narrows the type for static analysis.
     */
    private function user(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();

        return $user;
    }
}
