'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { LessonFormValues } from '@/lib/admin/schema';
import type { BunnyVideo } from '@/lib/admin/types';
import { BunnyVideoPicker, formatDuration } from './BunnyVideoPicker';

export function emptyLesson(defaultLibraryId: string): LessonFormValues {
  return {
    id: null,
    title: '',
    video_url: '',
    bunny_video_id: '',
    bunny_library_id: defaultLibraryId,
    duration: 0,
    is_locked: false,
    pdf_resource_urls: [],
  };
}

interface LessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null ⇒ creating a new lesson. */
  initialValue: LessonFormValues | null;
  moduleTitle: string;
  defaultLibraryId: string;
  onSubmit: (lesson: LessonFormValues) => void;
}

/**
 * Edits one lesson in local state and hands the finished object back to the
 * curriculum field array. Nothing is written to the database until the whole
 * course form is saved.
 */
export function LessonDialog({
  open,
  onOpenChange,
  initialValue,
  moduleTitle,
  defaultLibraryId,
  onSubmit,
}: LessonDialogProps) {
  const [draft, setDraft] = useState<LessonFormValues>(() => emptyLesson(defaultLibraryId));
  const [error, setError] = useState<string | null>(null);

  // Reset whenever the dialog opens so a previous edit never leaks in.
  useEffect(() => {
    if (!open) return;
    setDraft(initialValue ?? emptyLesson(defaultLibraryId));
    setError(null);
  }, [open, initialValue, defaultLibraryId]);

  const handleBunnySelect = (video: BunnyVideo) => {
    setDraft((current) => ({
      ...current,
      // Title stays editable afterwards.
      title: video.title || current.title,
      bunny_video_id: video.guid,
      bunny_library_id: current.bunny_library_id || defaultLibraryId,
      duration: video.duration || current.duration,
    }));
    setError(null);
  };

  const handleSave = () => {
    if (!draft.title.trim()) {
      setError('A lesson title is required.');
      return;
    }

    if (!draft.bunny_video_id.trim() && !draft.video_url.trim()) {
      setError('Attach a Bunny video or provide a fallback video URL.');
      return;
    }

    onSubmit({ ...draft, title: draft.title.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto overscroll-contain">
        <DialogHeader>
          <DialogTitle>{initialValue ? 'Edit lesson' : 'Add lesson'}</DialogTitle>
          <DialogDescription>
            {moduleTitle ? `In “${moduleTitle}”. ` : ''}
            Pick a video from your Bunny library to fill the title and duration automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Bunny Stream video</Label>
            <BunnyVideoPicker selectedGuid={draft.bunny_video_id} onSelect={handleBunnySelect} />
            {draft.bunny_video_id ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success">Attached</Badge>
                <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600 dark:bg-white/5 dark:text-gray-300">
                  {draft.bunny_video_id}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setDraft((current) => ({ ...current, bunny_video_id: '', duration: 0 }))
                  }
                >
                  Clear
                </Button>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-title">Lesson title</Label>
            <Input
              id="lesson-title"
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Estimating time and cost realistically"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lesson-duration">Duration (seconds)</Label>
              <Input
                id="lesson-duration"
                type="number"
                min={0}
                max={86400}
                value={String(draft.duration)}
                onChange={(event) => {
                  const parsed = Number(event.target.value);
                  setDraft((current) => ({
                    ...current,
                    duration: Number.isNaN(parsed) ? 0 : Math.max(0, Math.floor(parsed)),
                  }));
                }}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatDuration(draft.duration)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lesson-library">Bunny library ID</Label>
              <Input
                id="lesson-library"
                value={draft.bunny_library_id}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, bunny_library_id: event.target.value }))
                }
                placeholder={defaultLibraryId}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-url">Fallback video URL</Label>
            <Input
              id="lesson-url"
              type="url"
              value={draft.video_url}
              onChange={(event) =>
                setDraft((current) => ({ ...current, video_url: event.target.value }))
              }
              placeholder="https://…/lesson.mp4"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Only used when no Bunny video is attached.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 p-4 dark:border-white/10">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Locked</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Locked lessons are visible but not playable.
              </p>
            </div>
            <Switch
              checked={draft.is_locked}
              onCheckedChange={(checked) =>
                setDraft((current) => ({ ...current, is_locked: checked }))
              }
              aria-label="Locked"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            {initialValue ? 'Update lesson' : 'Add lesson'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
