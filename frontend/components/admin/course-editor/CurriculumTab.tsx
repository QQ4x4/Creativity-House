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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  emptyModule,
  emptySubModule,
  type CourseFormValues,
  type LessonFormValues,
} from '@/lib/admin/schema';
import { cn } from '@/lib/utils';
import { formatDuration } from './BunnyVideoPicker';
import { LessonDialog } from './LessonDialog';

type PendingDelete =
  | { kind: 'lesson'; subModuleIndex: number; lessonIndex: number; title: string }
  | { kind: 'sub_module'; subModuleIndex: number; title: string; lessonCount: number }
  | { kind: 'module'; title: string; lessonCount: number };

interface SortableLessonRowProps {
  id: string;
  lessonIndex: number;
  lesson: LessonFormValues | undefined;
  onEdit: () => void;
  onRequestRemove: () => void;
}

function SortableLessonRow({
  id,
  lessonIndex,
  lesson,
  onEdit,
  onRequestRemove,
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
        isDragging &&
          'z-10 border-plum-400 shadow-lg ring-2 ring-plum-400/30 dark:border-gold-400/50 dark:ring-gold-400/20'
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
          onClick={onRequestRemove}
          aria-label={`Remove lesson ${lessonIndex + 1}`}
          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </li>
  );
}

interface SubModuleAccordionProps {
  id: string;
  moduleIndex: number;
  subModuleIndex: number;
  moduleTitle: string | undefined;
  defaultLibraryId: string;
  onRequestRemove: () => void;
}

function SubModuleAccordion({
  id,
  moduleIndex,
  subModuleIndex,
  moduleTitle,
  defaultLibraryId,
  onRequestRemove,
}: SubModuleAccordionProps) {
  const { control, register, setValue, formState } = useFormContext<CourseFormValues>();

  const { fields, append, update, remove, move } = useFieldArray({
    control,
    name: `modules.${moduleIndex}.sub_modules.${subModuleIndex}.lessons` as const,
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [pendingLessonDelete, setPendingLessonDelete] = useState<{
    index: number;
    title: string;
  } | null>(null);

  const subModule = useWatch({
    control,
    name: `modules.${moduleIndex}.sub_modules.${subModuleIndex}`,
  });
  const isOpen = Boolean(subModule?.is_open);
  const lessons = subModule?.lessons ?? [];
  const titleEn = subModule?.title_en || 'Untitled section';

  const titleError =
    formState.errors.modules?.[moduleIndex]?.sub_modules?.[subModuleIndex]?.title_en?.message;

  const lessonIds = useMemo(() => fields.map((field) => field.id), [fields]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const totalSeconds = lessons.reduce((sum, lesson) => sum + (Number(lesson?.duration) || 0), 0);

  const toggleOpen = () => {
    setValue(
      `modules.${moduleIndex}.sub_modules.${subModuleIndex}.is_open` as const,
      !isOpen,
      { shouldDirty: false }
    );
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
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'overflow-hidden rounded-xl border border-gray-200 bg-gray-50/80 dark:border-white/10 dark:bg-white/[0.03]',
        isDragging && 'z-10 opacity-95 shadow-lg ring-2 ring-plum-400/30 dark:ring-gold-400/20'
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white hover:text-gray-700 active:cursor-grabbing dark:hover:bg-white/10 dark:hover:text-gray-200"
          aria-label={`Drag to reorder sub-module ${subModuleIndex + 1}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>

        <button
          type="button"
          onClick={toggleOpen}
          aria-expanded={isOpen}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-start hover:bg-white/70 dark:hover:bg-white/[0.06]"
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-gold-500 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
              {titleEn}
            </span>
            <span className="mt-0.5 block text-[11px] text-gray-500 dark:text-gray-400">
              {fields.length} lesson{fields.length === 1 ? '' : 's'} · {formatDuration(totalSeconds)}
            </span>
          </span>
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRequestRemove}
          aria-label={`Remove sub-module ${subModuleIndex + 1}`}
          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      {isOpen ? (
        <div className="space-y-3 border-t border-gray-200 px-3 py-3 dark:border-white/10">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`sub-${moduleIndex}-${subModuleIndex}-en`}>Section title (EN)</Label>
              <Input
                id={`sub-${moduleIndex}-${subModuleIndex}-en`}
                {...register(
                  `modules.${moduleIndex}.sub_modules.${subModuleIndex}.title_en` as const
                )}
                placeholder="Chapter 1 — Getting Started"
                aria-invalid={Boolean(titleError)}
              />
              {titleError ? (
                <p className="text-xs font-medium text-red-600 dark:text-red-400">{titleError}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`sub-${moduleIndex}-${subModuleIndex}-ar`}>Section title (AR)</Label>
              <Input
                id={`sub-${moduleIndex}-${subModuleIndex}-ar`}
                {...register(
                  `modules.${moduleIndex}.sub_modules.${subModuleIndex}.title_ar` as const
                )}
                placeholder="الفصل 1 — البداية"
                dir="rtl"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Drag the grip handle to reorder lessons in this section
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingIndex(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add lesson
            </Button>
          </div>

          {fields.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 px-3 py-5 text-center text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
              No lessons in this section yet.
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
                      lesson={lessons[lessonIndex]}
                      onEdit={() => {
                        setEditingIndex(lessonIndex);
                        setDialogOpen(true);
                      }}
                      onRequestRemove={() =>
                        setPendingLessonDelete({
                          index: lessonIndex,
                          title: lessons[lessonIndex]?.title || 'Untitled lesson',
                        })
                      }
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>
      ) : null}

      <LessonDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialValue={editingIndex === null ? null : (lessons[editingIndex] ?? null)}
        moduleTitle={moduleTitle ? `${moduleTitle} · ${titleEn}` : titleEn}
        defaultLibraryId={defaultLibraryId}
        onSubmit={handleSubmitLesson}
      />

      <AlertDialog
        open={pendingLessonDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingLessonDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingLessonDelete?.title || 'Untitled lesson'}” will be removed from the editor.
              Save the course to make this permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={() => {
                if (pendingLessonDelete) remove(pendingLessonDelete.index);
                setPendingLessonDelete(null);
              }}
            >
              Delete lesson
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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
  const { control, register, setValue, formState } = useFormContext<CourseFormValues>();

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: `modules.${moduleIndex}.sub_modules` as const,
  });

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const moduleTitle = useWatch({ control, name: `modules.${moduleIndex}.title_en` });
  const subModules = useWatch({ control, name: `modules.${moduleIndex}.sub_modules` });

  const lessonCount = (subModules ?? []).reduce(
    (sum, sub) => sum + (sub?.lessons?.length ?? 0),
    0
  );
  const totalSeconds = (subModules ?? []).reduce(
    (sum, sub) =>
      sum + (sub?.lessons ?? []).reduce((inner, lesson) => inner + (Number(lesson?.duration) || 0), 0),
    0
  );

  const moduleErrors = formState.errors.modules?.[moduleIndex];
  const titleError = moduleErrors?.title_en?.message;

  const subModuleIds = useMemo(() => fields.map((field) => field.id), [fields]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const setAllOpen = (open: boolean) => {
    fields.forEach((_, index) => {
      setValue(`modules.${moduleIndex}.sub_modules.${index}.is_open` as const, open, {
        shouldDirty: false,
      });
    });
  };

  const handleSubModuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((field) => field.id === active.id);
    const newIndex = fields.findIndex((field) => field.id === over.id);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

    move(oldIndex, newIndex);
  };

  const confirmPendingDelete = () => {
    if (!pendingDelete) return;

    if (pendingDelete.kind === 'sub_module') {
      remove(pendingDelete.subModuleIndex);
    } else if (pendingDelete.kind === 'module') {
      onRemove();
    }

    setPendingDelete(null);
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
                {fields.length} section{fields.length === 1 ? '' : 's'}
              </span>
              <span>
                {lessonCount} lesson{lessonCount === 1 ? '' : 's'}
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
            onClick={() =>
              setPendingDelete({
                kind: 'module',
                title: moduleTitle || 'Untitled module',
                lessonCount,
              })
            }
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

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Sub-modules</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Chapters inside this module — drag to reorder
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setAllOpen(true)}>
                Expand all
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAllOpen(false)}>
                Collapse all
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append(emptySubModule({ title_en: '', is_open: true }))}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add sub-module
              </Button>
            </div>
          </div>

          {fields.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 px-3 py-6 text-center text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
              No sub-modules yet. Add a section to start grouping lessons.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSubModuleDragEnd}
            >
              <SortableContext items={subModuleIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {fields.map((field, subModuleIndex) => (
                    <SubModuleAccordion
                      key={field.id}
                      id={field.id}
                      moduleIndex={moduleIndex}
                      subModuleIndex={subModuleIndex}
                      moduleTitle={moduleTitle}
                      defaultLibraryId={defaultLibraryId}
                      onRequestRemove={() =>
                        setPendingDelete({
                          kind: 'sub_module',
                          subModuleIndex,
                          title: subModules?.[subModuleIndex]?.title_en || 'Untitled section',
                          lessonCount: subModules?.[subModuleIndex]?.lessons?.length ?? 0,
                        })
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete?.kind === 'module'
                ? 'Delete this module?'
                : 'Delete this sub-module?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.kind === 'module'
                ? `“${pendingDelete.title || 'Untitled module'}” and its ${pendingDelete.lessonCount} lesson${
                    pendingDelete.lessonCount === 1 ? '' : 's'
                  } will be removed from the editor. Save the course to make this permanent.`
                : `“${pendingDelete?.title || 'Untitled section'}” and its ${
                    pendingDelete?.kind === 'sub_module' ? pendingDelete.lessonCount : 0
                  } lesson${
                    pendingDelete?.kind === 'sub_module' && pendingDelete.lessonCount === 1
                      ? ''
                      : 's'
                  } will be removed from the editor. Save the course to make this permanent.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction type="button" onClick={confirmPendingDelete}>
              {pendingDelete?.kind === 'module' ? 'Delete module' : 'Delete sub-module'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
          Modules contain collapsible sub-modules (chapters), which contain lessons. This tree
          drives the student player sidebar and the public syllabus preview. Nothing is saved until
          you submit the form.
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

        <Button type="button" variant="outline" onClick={() => append(emptyModule())}>
          <Plus className="h-4 w-4" aria-hidden />
          Add module
        </Button>
      </CardContent>
    </Card>
  );
}
