'use client';

import { useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Lock,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  Video,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { CourseFormValues, LessonFormValues } from '@/lib/admin/schema';
import { formatDuration } from './BunnyVideoPicker';
import { LessonDialog } from './LessonDialog';

interface ModuleCardProps {
  moduleIndex: number;
  totalModules: number;
  defaultLibraryId: string;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}

function ModuleCard({
  moduleIndex,
  totalModules,
  defaultLibraryId,
  onRemove,
  onMove,
}: ModuleCardProps) {
  const { control, register, formState } = useFormContext<CourseFormValues>();

  const { fields, append, update, remove, move } = useFieldArray({
    control,
    name: `modules.${moduleIndex}.lessons` as const,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const moduleTitle = useWatch({ control, name: `modules.${moduleIndex}.title_en` });
  const lessons = useWatch({ control, name: `modules.${moduleIndex}.lessons` });

  const totalSeconds = (lessons ?? []).reduce(
    (sum, lesson) => sum + (Number(lesson?.duration) || 0),
    0
  );

  const moduleErrors = formState.errors.modules?.[moduleIndex];
  const titleError = moduleErrors?.title_en?.message;

  const openCreate = () => {
    setEditingIndex(null);
    setDialogOpen(true);
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    setDialogOpen(true);
  };

  const handleSubmitLesson = (lesson: LessonFormValues) => {
    if (editingIndex === null) {
      append(lesson);
      return;
    }
    update(editingIndex, lesson);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.02]">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-50 text-xs font-bold text-plum-700 dark:bg-gold-400/15 dark:text-gold-200">
            {moduleIndex + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-gray-900 dark:text-white">
              {moduleTitle || 'Untitled module'}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>
                {fields.length} lesson{fields.length === 1 ? '' : 's'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden />
                {formatDuration(totalSeconds)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onMove(-1)}
            disabled={moduleIndex === 0}
            aria-label={`Move module ${moduleIndex + 1} up`}
          >
            <ChevronUp className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onMove(1)}
            disabled={moduleIndex === totalModules - 1}
            aria-label={`Move module ${moduleIndex + 1} down`}
          >
            <ChevronDown className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label={`Remove module ${moduleIndex + 1}`}
            className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`module-${moduleIndex}-title-en`}>Module title (EN)</Label>
            <Input
              id={`module-${moduleIndex}-title-en`}
              {...register(`modules.${moduleIndex}.title_en` as const)}
              placeholder="Module 1 — People & Leadership"
              aria-invalid={Boolean(titleError)}
            />
            {titleError ? (
              <p className="text-xs font-medium text-red-600 dark:text-red-400">{titleError}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`module-${moduleIndex}-title-ar`}>Module title (AR)</Label>
            <Input
              id={`module-${moduleIndex}-title-ar`}
              {...register(`modules.${moduleIndex}.title_ar` as const)}
              placeholder="المحور 1 — الأشخاص والقيادة"
              dir="rtl"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`module-${moduleIndex}-duration-en`}>Duration override (EN)</Label>
            <Input
              id={`module-${moduleIndex}-duration-en`}
              {...register(`modules.${moduleIndex}.duration_label_en` as const)}
              placeholder={`Auto: ${formatDuration(totalSeconds)}`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`module-${moduleIndex}-duration-ar`}>Duration override (AR)</Label>
            <Input
              id={`module-${moduleIndex}-duration-ar`}
              {...register(`modules.${moduleIndex}.duration_label_ar` as const)}
              placeholder="12 ساعة"
              dir="rtl"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Lessons</p>
            <Button type="button" variant="outline" size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add lesson
            </Button>
          </div>

          {fields.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 px-3 py-6 text-center text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
              No lessons yet. Add one from your Bunny library.
            </p>
          ) : (
            <ul className="space-y-2">
              {fields.map((field, lessonIndex) => {
                const lesson = lessons?.[lessonIndex];
                const missingVideo =
                  !lesson?.bunny_video_id?.trim() && !lesson?.video_url?.trim();

                return (
                  <li
                    key={field.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 dark:border-white/10"
                  >
                    <span className="w-6 shrink-0 text-xs tabular-nums text-gray-400">
                      {lessonIndex + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                        {lesson?.title || 'Untitled lesson'}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden />
                          {formatDuration(Number(lesson?.duration) || 0)}
                        </span>
                        {lesson?.bunny_video_id ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <Video className="h-3 w-3" aria-hidden />
                            Bunny
                          </span>
                        ) : null}
                        {lesson?.is_locked ? (
                          <span className="inline-flex items-center gap-1">
                            <Lock className="h-3 w-3" aria-hidden />
                            Locked
                          </span>
                        ) : null}
                        {missingVideo ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <TriangleAlert className="h-3 w-3" aria-hidden />
                            No video
                          </span>
                        ) : null}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => move(lessonIndex, Math.max(0, lessonIndex - 1))}
                        disabled={lessonIndex === 0}
                        aria-label={`Move lesson ${lessonIndex + 1} up`}
                      >
                        <ChevronUp className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          move(lessonIndex, Math.min(fields.length - 1, lessonIndex + 1))
                        }
                        disabled={lessonIndex === fields.length - 1}
                        aria-label={`Move lesson ${lessonIndex + 1} down`}
                      >
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(lessonIndex)}
                        aria-label={`Edit lesson ${lessonIndex + 1}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(lessonIndex)}
                        aria-label={`Remove lesson ${lessonIndex + 1}`}
                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <LessonDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialValue={editingIndex === null ? null : (lessons?.[editingIndex] ?? null)}
        moduleTitle={moduleTitle}
        defaultLibraryId={defaultLibraryId}
        onSubmit={handleSubmitLesson}
      />
    </div>
  );
}

interface CurriculumTabProps {
  defaultLibraryId: string;
}

export function CurriculumTab({ defaultLibraryId }: CurriculumTabProps) {
  const { control } = useFormContext<CourseFormValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'modules' });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Curriculum</CardTitle>
        <CardDescription>
          These modules and lessons are the single source of truth: they drive the student player
          sidebar and the syllabus preview on the public course page. Nothing is saved until you
          submit the form.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {fields.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
            No modules yet. Add your first module to start building the curriculum.
          </p>
        ) : (
          fields.map((field, index) => (
            <ModuleCard
              key={field.id}
              moduleIndex={index}
              totalModules={fields.length}
              defaultLibraryId={defaultLibraryId}
              onRemove={() => remove(index)}
              onMove={(direction) => {
                const target = index + direction;
                if (target < 0 || target >= fields.length) return;
                move(index, target);
              }}
            />
          ))
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            append({
              id: null,
              title_en: '',
              title_ar: '',
              duration_label_en: '',
              duration_label_ar: '',
              lessons: [],
            })
          }
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add module
        </Button>
      </CardContent>
    </Card>
  );
}
