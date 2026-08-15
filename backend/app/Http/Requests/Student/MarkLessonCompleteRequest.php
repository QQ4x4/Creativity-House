<?php

namespace App\Http\Requests\Student;

use App\Models\Course;
use App\Models\Lesson;
use App\Services\Student\EnrollmentService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Serves both request shapes:
 *   POST   /api/v1/progress/complete-lesson              (body: course_id, lesson_id)
 *   POST   /api/v1/courses/{course}/lessons/{lesson}/complete   (route params)
 *
 * Route parameters are folded into the payload before validation, so the rules
 * below are the only place lesson ownership is enforced.
 */
class MarkLessonCompleteRequest extends FormRequest
{
    /**
     * Enrollment is an authorization concern → 403, not a validation error.
     * Reads raw input deliberately: the value is only ever cast to int and bound
     * into a parameterized query.
     */
    public function authorize(EnrollmentService $enrollment): bool
    {
        $user = $this->user();
        $courseId = $this->resolvedCourseId();

        if ($user === null || $courseId === null) {
            return false;
        }

        return $enrollment->isEnrolled($user->id, $courseId);
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'course_id' => $this->resolvedCourseId(),
            'lesson_id' => $this->resolvedLessonId(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // `whereNull('deleted_at')` matters: `exists` ignores the soft-delete
            // scope, so an archived course/lesson would otherwise validate.
            'course_id' => [
                'required',
                'integer',
                Rule::exists('courses', 'id')->whereNull('deleted_at'),
            ],
            'lesson_id' => [
                'required',
                'integer',
                Rule::exists('lessons', 'id')->whereNull('deleted_at'),
            ],
            'completed' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Ownership check runs after the shape is known, so `lesson_id` is guaranteed
     * to be an existing integer here.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $belongs = Lesson::query()
                    ->whereKey((int) $this->input('lesson_id'))
                    ->where('course_id', (int) $this->input('course_id'))
                    ->exists();

                if (! $belongs) {
                    $validator->errors()->add(
                        'lesson_id',
                        'This lesson does not belong to the specified course.'
                    );
                }
            },
        ];
    }

    /**
     * Whether the caller wants the lesson marked complete. POST defaults to true;
     * DELETE always means "uncomplete".
     */
    public function shouldComplete(): bool
    {
        if ($this->method() === 'DELETE') {
            return false;
        }

        return $this->boolean('completed', true);
    }

    public function courseId(): int
    {
        return (int) $this->validated()['course_id'];
    }

    public function lessonId(): int
    {
        return (int) $this->validated()['lesson_id'];
    }

    private function resolvedCourseId(): ?int
    {
        $route = $this->route('course');

        if ($route instanceof Course) {
            return $route->id;
        }

        $value = $route ?? $this->input('course_id');

        if (is_numeric($value)) {
            return (int) $value;
        }

        // Tolerate a slug in the route (the course routes accept both).
        if (is_string($value) && $value !== '') {
            $id = Course::query()->where('slug', $value)->value('id');

            return $id !== null ? (int) $id : null;
        }

        return null;
    }

    private function resolvedLessonId(): ?int
    {
        $route = $this->route('lesson');

        if ($route instanceof Lesson) {
            return $route->id;
        }

        $value = $route ?? $this->input('lesson_id');

        return is_numeric($value) ? (int) $value : null;
    }
}
