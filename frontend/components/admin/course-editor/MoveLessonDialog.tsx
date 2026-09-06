'use client';

import { useEffect, useMemo, useState } from 'react';
import { FolderInput, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { updateAdminLesson } from '@/lib/admin/api';
import { ApiError } from '@/lib/api';
import type { CourseFormValues, LessonFormValues } from '@/lib/admin/schema';

export type LessonLocation = {
  moduleIndex: number;
  subModuleIndex: number;
  lessonIndex: number;
};

export type SubModuleDestination = {
  key: string;
  moduleIndex: number;
  subModuleIndex: number;
  moduleId: number | null;
  subModuleId: number | null;
  moduleTitle: string;
  subModuleTitle: string;
  lessonCount: number;
};

interface MoveLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number | string;
  lesson: LessonFormValues;
  location: LessonLocation;
  destinations: SubModuleDestination[];
  onMoved: (from: LessonLocation, to: { moduleIndex: number; subModuleIndex: number }) => void;
}

/**
 * Long-distance teleport for lessons across modules / sub-modules.
 * Updates local form state immediately; persists via API when both the lesson
 * and destination already have database ids.
 */
export function MoveLessonDialog({
  open,
  onOpenChange,
  courseId,
  lesson,
  location,
  destinations,
  onMoved,
}: MoveLessonDialogProps) {
  const currentKey = `${location.moduleIndex}:${location.subModuleIndex}`;
  const options = useMemo(
    () => destinations.filter((destination) => destination.key !== currentKey),
    [destinations, currentKey]
  );

  const [selectedKey, setSelectedKey] = useState(options[0]?.key ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedKey(options[0]?.key ?? '');
    }
  }, [open, options]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const handleMove = async () => {
    const destination = destinations.find((item) => item.key === selectedKey);
    if (!destination) {
      toast.error('Choose a destination sub-module.');
      return;
    }

    setSaving(true);
    try {
      if (lesson.id && destination.subModuleId && courseId) {
        await updateAdminLesson(courseId, lesson.id, {
          sub_module_id: destination.subModuleId,
        });
      }

      onMoved(location, {
        moduleIndex: destination.moduleIndex,
        subModuleIndex: destination.subModuleIndex,
      });

      toast.success(
        lesson.id && destination.subModuleId
          ? `Moved “${lesson.title || 'lesson'}” to ${destination.subModuleTitle}.`
          : `Moved “${lesson.title || 'lesson'}” in the editor. Save the course to persist.`
      );
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not move the lesson.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="h-5 w-5 text-plum-600 dark:text-gold-300" aria-hidden />
            Move lesson
          </DialogTitle>
          <DialogDescription>
            Send “{lesson.title || 'Untitled lesson'}” to another sub-module. Bunny video, title, and
            duration stay intact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="move-lesson-destination">Destination</Label>
          {options.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
              No other sub-modules available. Add another section first.
            </p>
          ) : (
            <select
              id="move-lesson-destination"
              value={selectedKey}
              onChange={(event) => setSelectedKey(event.target.value)}
              className="flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-plum-500/30 dark:border-white/10 dark:bg-black/20 dark:text-gray-100"
            >
              {options.map((destination) => (
                <option key={destination.key} value={destination.key}>
                  {destination.moduleTitle} → {destination.subModuleTitle} (
                  {destination.lessonCount} lesson{destination.lessonCount === 1 ? '' : 's'})
                </option>
              ))}
            </select>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleMove} disabled={saving || options.length === 0}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Moving…
              </>
            ) : (
              'Move'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Build selectable destinations from the live form tree. */
export function buildSubModuleDestinations(
  modules: CourseFormValues['modules'] | undefined
): SubModuleDestination[] {
  const destinations: SubModuleDestination[] = [];

  (modules ?? []).forEach((module, moduleIndex) => {
    (module.sub_modules ?? []).forEach((subModule, subModuleIndex) => {
      destinations.push({
        key: `${moduleIndex}:${subModuleIndex}`,
        moduleIndex,
        subModuleIndex,
        moduleId: module.id,
        subModuleId: subModule.id,
        moduleTitle: module.title_en?.trim() || `Module ${moduleIndex + 1}`,
        subModuleTitle: subModule.title_en?.trim() || `Section ${subModuleIndex + 1}`,
        lessonCount: subModule.lessons?.length ?? 0,
      });
    });
  });

  return destinations;
}

/**
 * Move a lesson between any two sub-module arrays in form state (deep clone).
 * Returns false if indices are invalid or source === destination.
 */
export function relocateLessonInModules(
  modules: CourseFormValues['modules'],
  from: LessonLocation,
  to: { moduleIndex: number; subModuleIndex: number; insertIndex?: number }
): CourseFormValues['modules'] | null {
  if (
    from.moduleIndex === to.moduleIndex &&
    from.subModuleIndex === to.subModuleIndex &&
    to.insertIndex === undefined
  ) {
    return null;
  }

  const next = modules.map((module) => ({
    ...module,
    sub_modules: module.sub_modules.map((subModule) => ({
      ...subModule,
      lessons: [...(subModule.lessons ?? [])],
    })),
  }));

  const sourceSub = next[from.moduleIndex]?.sub_modules?.[from.subModuleIndex];
  const destSub = next[to.moduleIndex]?.sub_modules?.[to.subModuleIndex];
  if (!sourceSub || !destSub) return null;

  if (from.lessonIndex < 0 || from.lessonIndex >= sourceSub.lessons.length) return null;

  const [lesson] = sourceSub.lessons.splice(from.lessonIndex, 1);
  if (!lesson) return null;

  // Ensure destination chapter is expanded so the teleport is visible.
  destSub.is_open = true;

  const insertAt =
    typeof to.insertIndex === 'number'
      ? Math.max(0, Math.min(to.insertIndex, destSub.lessons.length))
      : destSub.lessons.length;

  // Same-container reorder: after splice, adjust insert index if needed.
  if (from.moduleIndex === to.moduleIndex && from.subModuleIndex === to.subModuleIndex) {
    const adjusted =
      from.lessonIndex < insertAt ? insertAt - 1 : insertAt;
    destSub.lessons.splice(adjusted, 0, lesson);
  } else {
    destSub.lessons.splice(insertAt, 0, lesson);
  }

  return next;
}
