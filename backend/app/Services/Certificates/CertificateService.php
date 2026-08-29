<?php

namespace App\Services\Certificates;

use App\Models\Course;
use App\Models\CourseCertificate;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Isolated certificate module — awards are never derived from progress %.
 *
 * Future admin UI / Filament actions should call into this service only.
 */
class CertificateService
{
    public function hasCertificate(int $userId, int $courseId): bool
    {
        return CourseCertificate::query()
            ->where('user_id', $userId)
            ->where('course_id', $courseId)
            ->exists();
    }

    /**
     * Batch lookup for a student library listing (avoids N+1).
     *
     * @param  list<int>  $courseIds
     * @return array<int, bool> course_id => has_certificate
     */
    public function hasCertificatesMap(int $userId, array $courseIds): array
    {
        if ($courseIds === []) {
            return [];
        }

        /** @var Collection<int, int> $awarded */
        $awarded = CourseCertificate::query()
            ->where('user_id', $userId)
            ->whereIn('course_id', $courseIds)
            ->pluck('course_id');

        $map = [];
        foreach ($courseIds as $courseId) {
            $map[(int) $courseId] = false;
        }

        foreach ($awarded as $courseId) {
            $map[(int) $courseId] = true;
        }

        return $map;
    }

    /**
     * Idempotent manual award (admin after exam). Does not touch progress/orders.
     */
    public function award(User $student, Course $course, ?User $admin = null, ?Carbon $awardedAt = null): CourseCertificate
    {
        /** @var CourseCertificate $certificate */
        $certificate = CourseCertificate::query()->firstOrNew([
            'user_id' => $student->id,
            'course_id' => $course->id,
        ]);

        if (! $certificate->exists) {
            $certificate->awarded_at = $awardedAt ?? now();
            $certificate->awarded_by_admin_id = $admin?->id;
            $certificate->save();
        }

        return $certificate;
    }

    public function revoke(int $userId, int $courseId): bool
    {
        return (bool) CourseCertificate::query()
            ->where('user_id', $userId)
            ->where('course_id', $courseId)
            ->delete();
    }
}
