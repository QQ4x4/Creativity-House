'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  useDroppable,
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
  FolderInput,
  GripVertical,
  Lock,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';

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
import { updateAdminLesson } from '@/lib/admin/api';
import { ApiError } from '@/lib/api';
import {
  emptyModule,
  emptySubModule,
  type CourseFormValues,
  type LessonFormValues,
} from '@/lib/admin/schema';
import { cn } from '@/lib/utils';
import { formatDuration } from './BunnyVideoPicker';
import { LessonDialog } from './LessonDialog';
import {
  MoveLessonDialog,
  buildSubModuleDestinations,
  relocateLessonInModules,
  type LessonLocation,
} from './MoveLessonDialog';

type PendingDelete =
  | { kind: 'lesson'; moduleIndex: number; subModuleIndex: number; lessonIndex: number; title: string }
  | { kind: 'sub_module'; subModuleIndex: number; title: string; lessonCount: number }
  | { kind: 'module'; title: string; lessonCount: number };

type ActiveLessonDrag = {
  id: string;
  moduleIndex: number;
  subModuleIndex: number;
  lesson: LessonFormValues;
};

function lessonDropId(moduleIndex: number, subModuleIndex: number) {
  return `lesson-drop-${moduleIndex}-${subModuleIndex}`;
}

function parseLessonDropId(id: string): { moduleIndex: number; subModuleIndex: number } | null {
  const match = /^lesson-drop-(\d+)-(\d+)$/.exec(id);
  if (!match) return null;
  return { moduleIndex: Number(match[1]), subModuleIndex: Number(match[2]) };
}

function LessonDragPreview({ lesson }: { lesson: LessonFormValues }) {
  return (
    <div className="pointer-events-none w-[min(100vw-2rem,28rem)] cursor-grabbing rounded-xl border border-plum-400 bg-white px-3 py-2.5 shadow-2xl ring-2 ring-plum-400/30 dark:border-gold-400/50 dark:bg-slate-900 dark:ring-gold-400/20">
      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
        {lesson.title || 'Untitled lesson'}
      </p>
      <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden />
          {formatDuration(Number(lesson.duration) || 0)}
        </span>
        {lesson.bunny_video_id ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Video className="h-3 w-3" aria-hidden />
            Bunny
          </span>
        ) : null}
      </p>
    </div>
  );
}

interface SortableLessonRowProps {
  id: string;
  lessonIndex: number;
  lesson: LessonFormValues | undefined;
  onEdit: () => void;
  onMove: () => void;
  onRequestRemove: () => void;
}

function SortableLessonRow({
  id,
  lessonIndex,
  lesson,
  onEdit,
  onMove,
  onRequestRemove,
}: SortableLessonRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { type: 'lesson' as const },
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
          'z-10 opacity-60 border-plum-400 shadow-lg ring-2 ring-plum-400/30 dark:border-gold-400/50 dark:ring-gold-400/20'
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
          onClick={onMove}
          aria-label={`Move lesson ${lessonIndex + 1}`}
          title="Move to another sub-module"
        >
          <FolderInput className="h-4 w-4" aria-hidden />
        </Button>
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
  lessonIds: string[];
  onRequestRemove: () => void;
  onEditLesson: (lessonIndex: number) => void;
  onMoveLesson: (lessonIndex: number) => void;
  onRequestRemoveLesson: (lessonIndex: number, title: string) => void;
  onAddLesson: () => void;
}

function SubModuleAccordion({
  id,
  moduleIndex,
  subModuleIndex,
  lessonIds,
  onRequestRemove,
  onEditLesson,
  onMoveLesson,
  onRequestRemoveLesson,
  onAddLesson,
}: SubModuleAccordionProps) {
  const { control, register, setValue, formState } = useFormContext<CourseFormValues>();

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: { type: 'sub-module' as const, moduleIndex, subModuleIndex },
  });

  const droppableId = lessonDropId(moduleIndex, subModuleIndex);
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: droppableId,
    data: { type: 'lesson-container' as const, moduleIndex, subModuleIndex },
  });

  const subModule = useWatch({
    control,
    name: `modules.${moduleIndex}.sub_modules.${subModuleIndex}`,
  });
  const isOpen = Boolean(subModule?.is_open);
  const lessons = subModule?.lessons ?? [];
  const titleEn = subModule?.title_en || 'Untitled section';

  const titleError =
    formState.errors.modules?.[moduleIndex]?.sub_modules?.[subModuleIndex]?.title_en?.message;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const totalSeconds = lessons.reduce((sum, lesson) => sum + (Number(lesson?.duration) || 0), 0);

  const toggleOpen = () => {
    setValue(`modules.${moduleIndex}.sub_modules.${subModuleIndex}.is_open` as const, !isOpen, {
      shouldDirty: false,
    });
  };

  const setRefs = (node: HTMLDivElement | null) => {
    setSortableRef(node);
  };

  return (
    <div
      ref={setRefs}
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
              {lessons.length} lesson{lessons.length === 1 ? '' : 's'} · {formatDuration(totalSeconds)}
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
              Drag lessons here to reorder or move between sections
            </p>
            <Button type="button" variant="outline" size="sm" onClick={onAddLesson}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add lesson
            </Button>
          </div>

          <div
            ref={setDroppableRef}
            className={cn(
              'min-h-[3rem] rounded-xl transition-colors',
              isOver && 'bg-plum-50/80 ring-2 ring-plum-400/40 dark:bg-gold-400/10 dark:ring-gold-400/30'
            )}
          >
            {lessons.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 px-3 py-5 text-center text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
                Drop lessons here · empty section
              </p>
            ) : (
              <SortableContext items={lessonIds} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2">
                  {lessonIds.map((lessonId, lessonIndex) => (
                    <SortableLessonRow
                      key={lessonId}
                      id={lessonId}
                      lessonIndex={lessonIndex}
                      lesson={lessons[lessonIndex]}
                      onEdit={() => onEditLesson(lessonIndex)}
                      onMove={() => onMoveLesson(lessonIndex)}
                      onRequestRemove={() =>
                        onRequestRemoveLesson(
                          lessonIndex,
                          lessons[lessonIndex]?.title || 'Untitled lesson'
                        )
                      }
                    />
                  ))}
                </ul>
              </SortableContext>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface ModuleCardProps {
  moduleIndex: number;
  totalModules: number;
  defaultLibraryId: string;
  courseId: number | string;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}

function ModuleCard({
  moduleIndex,
  totalModules,
  defaultLibraryId,
  courseId,
  onRemove,
  onMove,
}: ModuleCardProps) {
  const { control, register, setValue, getValues, formState } = useFormContext<CourseFormValues>();

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: `modules.${moduleIndex}.sub_modules` as const,
  });

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [lessonDialog, setLessonDialog] = useState<{
    subModuleIndex: number;
    lessonIndex: number | null;
  } | null>(null);
  const [moveTarget, setMoveTarget] = useState<LessonLocation | null>(null);
  const [activeLesson, setActiveLesson] = useState<ActiveLessonDrag | null>(null);

  const moduleTitle = useWatch({ control, name: `modules.${moduleIndex}.title_en` });
  const subModules = useWatch({ control, name: `modules.${moduleIndex}.sub_modules` });
  const allModules = useWatch({ control, name: 'modules' });

  const lessonCount = (subModules ?? []).reduce(
    (sum, sub) => sum + (sub?.lessons?.length ?? 0),
    0
  );
  const totalSeconds = (subModules ?? []).reduce(
    (sum, sub) =>
      sum +
      (sub?.lessons ?? []).reduce((inner, lesson) => inner + (Number(lesson?.duration) || 0), 0),
    0
  );

  const moduleErrors = formState.errors.modules?.[moduleIndex];
  const titleError = moduleErrors?.title_en?.message;

  const subModuleIds = useMemo(() => fields.map((field) => field.id), [fields]);

  // Lesson sortable ids must be unique across the module. Encode location.
  const lessonIdMap = useMemo(() => {
    /** @type {Map<string, { subModuleIndex: number; lessonIndex: number; fieldId: string }>} */
    const map = new Map();
    (subModules ?? []).forEach((sub, subModuleIndex) => {
      (sub?.lessons ?? []).forEach((_, lessonIndex) => {
        const id = `lesson-${moduleIndex}-${subModuleIndex}-${lessonIndex}`;
        map.set(id, { subModuleIndex, lessonIndex, fieldId: id });
      });
    });
    return map;
  }, [moduleIndex, subModules]);

  const lessonIdsBySubModule = useMemo(() => {
    return (subModules ?? []).map((sub, subModuleIndex) =>
      (sub?.lessons ?? []).map((_, lessonIndex) => `lesson-${moduleIndex}-${subModuleIndex}-${lessonIndex}`)
    );
  }, [moduleIndex, subModules]);

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

  const applyModules = (next: CourseFormValues['modules']) => {
    setValue('modules', next, { shouldDirty: true, shouldValidate: true });
  };

  const persistLessonMove = async (
    lesson: LessonFormValues,
    destinationSubModuleId: number | null | undefined
  ) => {
    if (!courseId || !lesson.id || !destinationSubModuleId) return;
    try {
      await updateAdminLesson(courseId, lesson.id, {
        sub_module_id: destinationSubModuleId,
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not persist the lesson move.';
      toast.error(message);
      throw error;
    }
  };

  const findLessonLocation = (sortableId: string): LessonLocation | null => {
    const found = lessonIdMap.get(sortableId);
    if (!found) return null;
    return {
      moduleIndex,
      subModuleIndex: found.subModuleIndex,
      lessonIndex: found.lessonIndex,
    };
  };

  const resolveDropLocation = (
    overId: string
  ): { moduleIndex: number; subModuleIndex: number; insertIndex?: number } | null => {
    const drop = parseLessonDropId(overId);
    if (drop && drop.moduleIndex === moduleIndex) {
      return { moduleIndex, subModuleIndex: drop.subModuleIndex };
    }

    const overLesson = findLessonLocation(overId);
    if (overLesson) {
      return {
        moduleIndex: overLesson.moduleIndex,
        subModuleIndex: overLesson.subModuleIndex,
        insertIndex: overLesson.lessonIndex,
      };
    }

    const subModuleIndex = fields.findIndex((field) => field.id === overId);
    if (subModuleIndex >= 0) {
      return { moduleIndex, subModuleIndex };
    }

    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const type = event.active.data.current?.type;
    if (type !== 'lesson') {
      setActiveLesson(null);
      return;
    }

    const location = findLessonLocation(String(event.active.id));
    if (!location) return;

    const lesson =
      getValues('modules')[location.moduleIndex]?.sub_modules?.[location.subModuleIndex]?.lessons?.[
        location.lessonIndex
      ];
    if (!lesson) return;

    setActiveLesson({
      id: String(event.active.id),
      moduleIndex: location.moduleIndex,
      subModuleIndex: location.subModuleIndex,
      lesson,
    });
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Visual feedback comes from useDroppable isOver; state moves on drag end.
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLesson(null);
    if (!over || active.id === over.id) return;

    const activeType = active.data.current?.type;

    if (activeType === 'sub-module') {
      const oldIndex = fields.findIndex((field) => field.id === active.id);
      // Only reorder when dropping onto another sub-module handle/card.
      const newIndex = fields.findIndex((field) => field.id === over.id);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      move(oldIndex, newIndex);
      return;
    }

    if (activeType !== 'lesson') return;

    const from = findLessonLocation(String(active.id));
    const to = resolveDropLocation(String(over.id));
    if (!from || !to) return;

    if (
      from.moduleIndex === to.moduleIndex &&
      from.subModuleIndex === to.subModuleIndex &&
      (to.insertIndex === undefined || to.insertIndex === from.lessonIndex)
    ) {
      return;
    }

    const modules = getValues('modules');
    const lesson =
      modules[from.moduleIndex]?.sub_modules?.[from.subModuleIndex]?.lessons?.[from.lessonIndex];
    if (!lesson) return;

    const destSub = modules[to.moduleIndex]?.sub_modules?.[to.subModuleIndex];
    const next = relocateLessonInModules(modules, from, to);
    if (!next) return;

    applyModules(next);

    const crossed =
      from.moduleIndex !== to.moduleIndex || from.subModuleIndex !== to.subModuleIndex;

    if (crossed) {
      try {
        await persistLessonMove(lesson, destSub?.id);
      } catch {
        // Form already updated; user can save curriculum to reconcile.
      }
    }
  };

  const confirmPendingDelete = () => {
    if (!pendingDelete) return;

    if (pendingDelete.kind === 'lesson') {
      const modules = getValues('modules');
      const next = modules.map((module, mIndex) => {
        if (mIndex !== pendingDelete.moduleIndex) return module;
        return {
          ...module,
          sub_modules: module.sub_modules.map((sub, sIndex) => {
            if (sIndex !== pendingDelete.subModuleIndex) return sub;
            return {
              ...sub,
              lessons: sub.lessons.filter((_, lIndex) => lIndex !== pendingDelete.lessonIndex),
            };
          }),
        };
      });
      applyModules(next);
    } else if (pendingDelete.kind === 'sub_module') {
      remove(pendingDelete.subModuleIndex);
    } else {
      onRemove();
    }

    setPendingDelete(null);
  };

  const editingLesson =
    lessonDialog === null
      ? null
      : (subModules?.[lessonDialog.subModuleIndex]?.lessons?.[lessonDialog.lessonIndex ?? -1] ??
        null);

  const destinations = useMemo(() => buildSubModuleDestinations(allModules), [allModules]);

  const movingLesson =
    moveTarget === null
      ? null
      : (allModules?.[moveTarget.moduleIndex]?.sub_modules?.[moveTarget.subModuleIndex]?.lessons?.[
          moveTarget.lessonIndex
        ] ?? null);

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
                Drag lessons between sections · use Move for long-distance jumps
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
              collisionDetection={closestCorners}
              autoScroll={{
                threshold: { x: 0.15, y: 0.15 },
                acceleration: 12,
                interval: 5,
              }}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={subModuleIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {fields.map((field, subModuleIndex) => (
                    <SubModuleAccordion
                      key={field.id}
                      id={field.id}
                      moduleIndex={moduleIndex}
                      subModuleIndex={subModuleIndex}
                      lessonIds={lessonIdsBySubModule[subModuleIndex] ?? []}
                      onRequestRemove={() =>
                        setPendingDelete({
                          kind: 'sub_module',
                          subModuleIndex,
                          title: subModules?.[subModuleIndex]?.title_en || 'Untitled section',
                          lessonCount: subModules?.[subModuleIndex]?.lessons?.length ?? 0,
                        })
                      }
                      onEditLesson={(lessonIndex) =>
                        setLessonDialog({ subModuleIndex, lessonIndex })
                      }
                      onMoveLesson={(lessonIndex) =>
                        setMoveTarget({ moduleIndex, subModuleIndex, lessonIndex })
                      }
                      onRequestRemoveLesson={(lessonIndex, title) =>
                        setPendingDelete({
                          kind: 'lesson',
                          moduleIndex,
                          subModuleIndex,
                          lessonIndex,
                          title,
                        })
                      }
                      onAddLesson={() => setLessonDialog({ subModuleIndex, lessonIndex: null })}
                    />
                  ))}
                </div>
              </SortableContext>

              {typeof document !== 'undefined'
                ? createPortal(
                    <DragOverlay dropAnimation={null} zIndex={10000}>
                      {activeLesson ? (
                        <LessonDragPreview lesson={activeLesson.lesson} />
                      ) : null}
                    </DragOverlay>,
                    document.body
                  )
                : null}
            </DndContext>
          )}
        </div>
      </div>

      <LessonDialog
        open={lessonDialog !== null}
        onOpenChange={(open) => {
          if (!open) setLessonDialog(null);
        }}
        initialValue={lessonDialog?.lessonIndex === null ? null : editingLesson}
        moduleTitle={
          moduleTitle
            ? `${moduleTitle} · ${
                subModules?.[lessonDialog?.subModuleIndex ?? -1]?.title_en || 'Section'
              }`
            : 'Module'
        }
        defaultLibraryId={defaultLibraryId}
        onSubmit={(lesson) => {
          if (lessonDialog === null) return;
          const modules = getValues('modules');
          const next = modules.map((module, mIndex) => {
            if (mIndex !== moduleIndex) return module;
            return {
              ...module,
              sub_modules: module.sub_modules.map((sub, sIndex) => {
                if (sIndex !== lessonDialog.subModuleIndex) return sub;
                if (lessonDialog.lessonIndex === null) {
                  return { ...sub, lessons: [...sub.lessons, lesson], is_open: true };
                }
                return {
                  ...sub,
                  lessons: sub.lessons.map((row, lIndex) =>
                    lIndex === lessonDialog.lessonIndex ? lesson : row
                  ),
                };
              }),
            };
          });
          applyModules(next);
          setLessonDialog(null);
        }}
      />

      {movingLesson && moveTarget ? (
        <MoveLessonDialog
          open
          onOpenChange={(open) => {
            if (!open) setMoveTarget(null);
          }}
          courseId={courseId}
          lesson={movingLesson}
          location={moveTarget}
          destinations={destinations}
          onMoved={(from, to) => {
            const modules = getValues('modules');
            const next = relocateLessonInModules(modules, from, to);
            if (next) applyModules(next);
            setMoveTarget(null);
          }}
        />
      ) : null}

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
                : pendingDelete?.kind === 'sub_module'
                  ? 'Delete this sub-module?'
                  : 'Delete this lesson?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.kind === 'lesson'
                ? `“${pendingDelete.title || 'Untitled lesson'}” will be removed from the editor. Save the course to make this permanent.`
                : pendingDelete?.kind === 'module'
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
              {pendingDelete?.kind === 'module'
                ? 'Delete module'
                : pendingDelete?.kind === 'sub_module'
                  ? 'Delete sub-module'
                  : 'Delete lesson'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CurriculumTabProps {
  defaultLibraryId: string;
  courseId: number | string;
}

export function CurriculumTab({ defaultLibraryId, courseId }: CurriculumTabProps) {
  const { control } = useFormContext<CourseFormValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'modules' });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Curriculum</CardTitle>
        <CardDescription>
          Modules contain collapsible sub-modules (chapters), which contain lessons. Drag lessons
          between adjacent sections, or use Move for long-distance jumps. Save the form to persist
          the full tree.
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
              courseId={courseId}
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
