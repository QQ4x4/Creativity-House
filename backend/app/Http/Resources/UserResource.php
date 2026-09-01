<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 *
 * Whitelist-only: password, remember_token, verification_code, code_expires_at,
 * and google_id are never serialized.
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'name' => $this->full_name,
            'email' => $this->email,
            'phone_number' => $this->phone_number,
            'avatar_url' => $this->avatarUrl(),
            'email_verified' => $this->hasVerifiedEmail(),
            'email_verified_at' => $this->email_verified_at?->toISOString(),
            // Drives the admin route guard in the Next.js client. Authorization
            // itself is always enforced server-side by the `admin` middleware.
            'is_admin' => $this->isAdmin(),
            'notification_preferences' => $this->notificationPreferences(),
        ];
    }
}
