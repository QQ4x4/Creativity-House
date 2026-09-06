/**
 * Laravel admin API surface. Kept in one place so the whole admin module can be
 * repointed (or replaced with NextCRM Server Actions) from a single file.
 */
export const ADMIN_ENDPOINTS = {
  courses: '/v1/admin/courses',
  course: (id: number | string) => `/v1/admin/courses/${id}`,
  curriculum: (id: number | string) => `/v1/admin/courses/${id}/curriculum`,
  modules: (id: number | string) => `/v1/admin/courses/${id}/modules`,
  module: (courseId: number | string, moduleId: number | string) =>
    `/v1/admin/courses/${courseId}/modules/${moduleId}`,
  moduleLessons: (courseId: number | string, moduleId: number | string) =>
    `/v1/admin/courses/${courseId}/modules/${moduleId}/lessons`,
  lesson: (courseId: number | string, lessonId: number | string) =>
    `/v1/admin/courses/${courseId}/lessons/${lessonId}`,
  bunnyVideos: '/v1/admin/bunny/videos',
  lessonResourceUpload: '/v1/admin/lesson-resources/upload',
  imageUpload: '/v1/admin/upload-image',
} as const;
