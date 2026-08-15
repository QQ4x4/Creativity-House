<?php

namespace App\Services\Student;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Profile mutations for the Student Portal. Controllers pass already-validated
 * data in; nothing here re-validates.
 */
class ProfileService
{
    private const AVATAR_DIRECTORY = 'avatars';

    private const AVATAR_DISK = 'public';

    /**
     * @param  array{first_name: string, last_name: string, email: string, phone_number: string}  $data
     */
    public function updateProfile(User $user, array $data, ?UploadedFile $avatar = null): User
    {
        return DB::transaction(function () use ($user, $data, $avatar): User {
            $user->fill([
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                // Keep the legacy `name` column consistent with the split fields.
                'name' => trim($data['first_name'].' '.$data['last_name']),
                'email' => mb_strtolower($data['email']),
                'phone_number' => $data['phone_number'],
            ]);

            // Changing the email invalidates verification — the student must confirm
            // the new address before it is treated as verified.
            if ($user->isDirty('email')) {
                $user->email_verified_at = null;
            }

            if ($avatar !== null) {
                $user->avatar_url = $this->storeAvatar($user, $avatar);
            }

            $user->save();

            return $user->refresh();
        });
    }

    /**
     * Store a new avatar and return the public URL.
     */
    public function updateAvatar(User $user, UploadedFile $avatar): string
    {
        $path = $this->storeAvatar($user, $avatar);

        $user->forceFill(['avatar_url' => $path])->save();

        return (string) $user->refresh()->avatarUrl();
    }

    /**
     * Rotate the password and revoke API tokens so a stolen token can't outlive
     * the change. The current session stays valid (the student stays logged in).
     */
    public function updatePassword(User $user, string $newPassword): void
    {
        DB::transaction(function () use ($user, $newPassword): void {
            // `password` has a `hashed` cast — never hash manually here.
            $user->forceFill(['password' => $newPassword])->save();

            $user->tokens()->delete();
        });

        Log::info('Student password changed.', ['user_id' => $user->id]);
    }

    /**
     * @param  array<string, bool>  $preferences
     * @return array<string, bool>
     */
    public function updateNotificationPreferences(User $user, array $preferences): array
    {
        $user->forceFill(['notification_preferences' => $preferences])->save();

        return $user->refresh()->notificationPreferences();
    }

    /**
     * Persist the upload under a random name and drop the previous local file.
     * Returns the relative disk path (the column stores paths, not URLs).
     */
    private function storeAvatar(User $user, UploadedFile $avatar): string
    {
        $extension = mb_strtolower($avatar->getClientOriginalExtension() ?: 'jpg');
        $filename = sprintf('%d-%s.%s', $user->id, Str::random(24), $extension);

        $path = $avatar->storeAs(self::AVATAR_DIRECTORY, $filename, self::AVATAR_DISK);

        if ($path === false) {
            // Surfaces as a 500 rather than silently saving a broken path.
            throw new \RuntimeException('Unable to store the uploaded avatar.');
        }

        $this->deletePreviousAvatar($user);

        return $path;
    }

    /**
     * Only removes files this app stored. Absolute URLs (e.g. Google avatars) are
     * left alone.
     */
    private function deletePreviousAvatar(User $user): void
    {
        $previous = $user->getOriginal('avatar_url') ?? $user->avatar_url;

        if (blank($previous) || str_starts_with((string) $previous, 'http')) {
            return;
        }

        if (! str_starts_with((string) $previous, self::AVATAR_DIRECTORY.'/')) {
            return;
        }

        Storage::disk(self::AVATAR_DISK)->delete((string) $previous);
    }
}
