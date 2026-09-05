'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ExternalLink,
  FileAudio,
  FileText,
  Link2,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
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
import { uploadAdminLessonResource } from '@/lib/admin/api';
import {
  emptyLessonResource,
  type LessonFormValues,
  type LessonResourceFormValues,
} from '@/lib/admin/schema';
import type { BunnyVideo } from '@/lib/admin/types';
import { cn } from '@/lib/utils';
import { BunnyVideoPicker, formatDuration } from './BunnyVideoPicker';

const ACCEPT_EXTENSIONS =
  '.ogg,audio/ogg,audio/*,.mp3,.wav,.m4a,.aac,.flac,.zip,.rar,.pdf,.doc,.docx,.xlsx,.xls,image/*,.png,.jpg,.jpeg,.webp';

export function emptyLesson(defaultLibraryId: string): LessonFormValues {
  return {
    id: null,
    title: '',
    video_url: '',
    bunny_video_id: '',
    bunny_library_id: defaultLibraryId,
    duration: 0,
    is_locked: false,
    resources: [],
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
 * curriculum field array. File uploads hit the admin upload endpoint immediately;
 * the course Save still persists resources via curriculum JSON sync.
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
  const [resourceDraft, setResourceDraft] = useState<LessonResourceFormValues>(() =>
    emptyLessonResource()
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(initialValue ?? emptyLesson(defaultLibraryId));
    setResourceDraft(emptyLessonResource());
    setError(null);
    setIsUploading(false);
    setIsDragging(false);
  }, [open, initialValue, defaultLibraryId]);

  const handleBunnySelect = (video: BunnyVideo) => {
    setDraft((current) => ({
      ...current,
      title: video.title || current.title,
      bunny_video_id: video.guid,
      bunny_library_id: current.bunny_library_id || defaultLibraryId,
      duration: video.duration || current.duration,
    }));
    setError(null);
  };

  const addResource = (resource: LessonResourceFormValues) => {
    if (!resource.title.trim() || !resource.url.trim()) {
      setError('Each resource needs a name and a URL or uploaded file.');
      return;
    }

    setDraft((current) => ({
      ...current,
      resources: [...current.resources, { ...resource, title: resource.title.trim() }],
    }));
    setResourceDraft(emptyLessonResource({ type: resource.type }));
    setError(null);
  };

  const removeResource = (clientKey: string) => {
    setDraft((current) => ({
      ...current,
      resources: current.resources.filter((resource) => resource.client_key !== clientKey),
    }));
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const uploaded = await uploadAdminLessonResource(
        file,
        resourceDraft.title.trim() || undefined
      );

      addResource(
        emptyLessonResource({
          title: uploaded.title || file.name,
          type: 'file',
          url: uploaded.url,
          file_path: uploaded.file_path ?? null,
          file_size: uploaded.file_size ?? null,
          size_bytes: uploaded.size_bytes ?? null,
        })
      );
    } catch (caught) {
      setError(
        (caught as { message?: string })?.message ?? 'Could not upload that file. Try again.'
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddLink = () => {
    addResource({
      ...resourceDraft,
      type: 'link',
      title: resourceDraft.title.trim() || resourceDraft.url.trim(),
    });
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto overscroll-contain">
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

          {/* ─── Downloadable resources ───────────────────────────────────── */}
          <div className="space-y-3 rounded-2xl border border-gray-200 p-4 dark:border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <Paperclip className="h-4 w-4 text-plum-600 dark:text-gold-400" aria-hidden />
                  Downloadable Resources & Links
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Optional files and URLs shown in the student Resources tab.
                </p>
              </div>
              <Badge variant="secondary">{draft.resources.length}</Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resource-title">Resource name / label</Label>
              <Input
                id="resource-title"
                value={resourceDraft.title}
                onChange={(event) =>
                  setResourceDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Cheat Sheet PDF"
              />
            </div>

            <div
              role="group"
              aria-label="Resource type"
              className="inline-flex rounded-xl border border-gray-200 p-1 dark:border-white/10"
            >
              {(['file', 'link'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setResourceDraft((current) => ({ ...current, type, url: type === 'file' ? '' : current.url }))}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                    resourceDraft.type === type
                      ? 'bg-plum-600 text-white dark:bg-gold-500 dark:text-gray-900'
                      : 'text-gray-600 hover:text-plum-700 dark:text-gray-300 dark:hover:text-gold-200'
                  )}
                >
                  {type === 'file' ? 'Upload File' : 'External URL'}
                </button>
              ))}
            </div>

            {resourceDraft.type === 'file' ? (
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  void handleFile(event.dataTransfer.files?.[0] ?? null);
                }}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors',
                  isDragging
                    ? 'border-plum-500 bg-plum-50 dark:border-gold-400 dark:bg-gold-400/10'
                    : 'border-gray-300 bg-gray-50 dark:border-white/15 dark:bg-white/[0.03]'
                )}
              >
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-plum-600 dark:text-gold-400" />
                ) : (
                  <Upload className="h-6 w-6 text-gray-400" aria-hidden />
                )}
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {isUploading ? 'Uploading…' : 'Drag & drop a file here, or browse'}
                </p>
                <p className="text-[11px] text-gray-400">
                  PDF, DOC, DOCX, ZIP, OGG, MP3, WAV, XLSX, PNG, JPG — max 50 MB
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_EXTENSIONS}
                  className="sr-only"
                  onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="url"
                  value={resourceDraft.url}
                  onChange={(event) =>
                    setResourceDraft((current) => ({ ...current, url: event.target.value }))
                  }
                  placeholder="https://…"
                  className="flex-1"
                />
                <Button type="button" variant="secondary" onClick={handleAddLink}>
                  <Link2 className="h-4 w-4" aria-hidden />
                  Add link
                </Button>
              </div>
            )}

            {draft.resources.length > 0 ? (
              <ul className="space-y-2">
                {draft.resources.map((resource) => (
                  <li
                    key={resource.client_key}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-plum-700 dark:bg-gold-400/15 dark:text-gold-200">
                      <ResourceGlyph type={resource.type} url={resource.url} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {resource.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                        {resource.type === 'link' ? 'External link' : 'Uploaded file'}
                        {resource.file_size ? ` · ${resource.file_size}` : null}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
                      onClick={() => removeResource(resource.client_key)}
                      aria-label={`Remove ${resource.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
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
          <Button type="button" onClick={handleSave} disabled={isUploading}>
            {initialValue ? 'Update lesson' : 'Add lesson'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResourceGlyph({ type, url }: { type: 'file' | 'link'; url: string }) {
  if (type === 'link') {
    return <ExternalLink className="h-4 w-4" aria-hidden />;
  }

  const ext = (url.split('?')[0]?.split('.').pop() || '').toLowerCase();
  if (ext === 'mp3' || ext === 'wav' || ext === 'm4a') {
    return <FileAudio className="h-4 w-4" aria-hidden />;
  }

  return <FileText className="h-4 w-4" aria-hidden />;
}
