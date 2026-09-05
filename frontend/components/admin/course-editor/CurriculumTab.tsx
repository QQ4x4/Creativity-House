'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  GripVertical,
  Lock,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  Video,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { CourseFormValues, LessonFormValues } from '@/lib/admin/schema';
import { cn } from '@/lib/utils';
import { formatDuration } from './BunnyVideoPicker';
import { LessonDialog } from './LessonDialog';

interface SortableLessonRowProps {
  id: string;
  lessonIndex: number;
  lesson: LessonFormValues | undefined;
  onEdit: () => void;
  onRemove: () => void;
}

function SortableLessonRow({
  id,
  lessonIndex,
  lesson,
  onEdit,
  onRemove,
}: SortableLessonRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const missingVideo = !lesson?.bunny_video_id?.trim() && !lesson?.video_url?.trim();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-2.5 dark:border-white/10 dark:bg-white/[0.02] sm:gap-3 sm:px-3',
        isDragging && 'z-10 border-plum-400 shadow-lg ring-2 ring-plum-400/30 dark:border-gold-400/50 dark:ring-gold-400/20'
      )}
    >
      <button
        type="button"
        className="inline-flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 active:cursor-grabbing dark:hover:bg-white/10 dark:hover:text-gray-200"
        aria-label={`Drag to reorder lesson ${lessonIndex + 1}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>

      <span className="w-5 shrink-0 text-xs tabular-nums text-gray-400 sm:w-6">
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
          onClick={onEdit}
          aria-label={`Edit lesson ${lessonIndex + 1}`}
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={`Remove lesson ${lessonIndex + 1}`}
          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </li>
  );
}

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

  const lessonIds = useMemo(() => fields.map((field) => field.id), [fields]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Avoid accidental drags when tapping Edit / Delete nearby.
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleLessonDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((field) => field.id === active.id);
    const newIndex = fields.findIndex((field) => field.id === over.id);

    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

    move(oldIndex, newIndex);
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
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Lessons</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Drag the grip handle to reorder
              </p>
            </div>
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleLessonDragEnd}
            >
              <SortableContext items={lessonIds} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2">
                  {fields.map((field, lessonIndex) => (
                    <SortableLessonRow
                      key={field.id}
                      id={field.id}
                      lessonIndex={lessonIndex}
                      lesson={lessons?.[lessonIndex]}
                      onEdit={() => openEdit(lessonIndex)}
                      onRemove={() => remove(lessonIndex)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
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
