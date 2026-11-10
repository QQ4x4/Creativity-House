'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Loader2,
  Plus,
  Settings2,
  Star,
  Trash2,
  Pencil,
  Play,
  Video,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { BunnyVideoPicker, formatDuration } from '@/components/admin/course-editor/BunnyVideoPicker';
import {
  createAdminTestimonial,
  deleteAdminTestimonial,
  featureAdminTestimonial,
  fetchAdminTestimonials,
  publishAdminTestimonial,
  reorderAdminTestimonials,
} from '@/lib/admin/api';
import type { AdminTestimonialDto, BunnyVideo } from '@/lib/admin/types';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

import { PageSettingsDialog } from './PageSettingsDialog';
import { TestimonialEditDialog } from './TestimonialEditDialog';
import { TestimonialPreviewModal } from './TestimonialPreviewModal';

export function TestimonialsScreen() {
  const [rows, setRows] = useState<AdminTestimonialDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTestimonialDto | null>(null);
  const [preview, setPreview] = useState<AdminTestimonialDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminTestimonialDto | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchAdminTestimonials();
      setRows(list);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not load testimonials.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = useMemo(() => rows.map((r) => r.id), [rows]);
  const activeRow = rows.find((r) => r.id === activeId) ?? null;

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(Number(event.active.id));
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rows.findIndex((r) => r.id === Number(active.id));
    const newIndex = rows.findIndex((r) => r.id === Number(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(rows, oldIndex, newIndex);
    setRows(next);
    try {
      const saved = await reorderAdminTestimonials(next.map((r) => r.id));
      setRows(saved);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not save order.');
      await load();
    }
  };

  const handleBunnyPick = async (video: BunnyVideo) => {
    setCreating(true);
    try {
      const created = await createAdminTestimonial({
        bunny_video_id: video.guid,
        bunny_collection_id: video.collection_id,
        video_title: video.title,
        duration_seconds: video.duration,
        orientation: video.orientation || 'landscape',
        is_published: false,
        is_featured: false,
        person_name_en: video.title,
        caption_en: '',
      });
      setRows((current) => [...current, created]);
      setEditing(created);
      toast.success('Testimonial created — fill in the details.');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not create testimonial.');
    } finally {
      setCreating(false);
      setPickerOpen(false);
    }
  };

  const togglePublish = async (row: AdminTestimonialDto) => {
    setBusyId(row.id);
    try {
      const updated = await publishAdminTestimonial(row.id, !row.is_published);
      setRows((current) => current.map((r) => (r.id === updated.id ? updated : r)));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not update publish state.');
    } finally {
      setBusyId(null);
    }
  };

  const setFeatured = async (row: AdminTestimonialDto) => {
    setBusyId(row.id);
    try {
      const updated = await featureAdminTestimonial(row.id);
      setRows((current) =>
        current.map((r) =>
          r.id === updated.id
            ? updated
            : { ...r, is_featured: false }
        )
      );
      toast.success('Featured video updated.');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not set featured.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    try {
      await deleteAdminTestimonial(id);
      setRows((current) => current.filter((r) => r.id !== id));
      setDeleteTarget(null);
      toast.success('Testimonial deleted.');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not delete.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Testimonials</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Bunny videos for the public Success Stories page. Drag to reorder.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="me-2 h-4 w-4" aria-hidden />
            Page settings
          </Button>
          <Button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={creating}
            className="bg-plum-700 text-white hover:bg-plum-600"
          >
            {creating ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="me-2 h-4 w-4" aria-hidden />
            )}
            Add testimonial
          </Button>
        </div>
      </header>

      <BunnyVideoPicker
        selectedGuid=""
        hideTrigger
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        disabled={creating}
        title="Bunny media library"
        description='Pick a video from the “testimonial” collection (or any tab). Title, duration, and thumbnail are filled automatically.'
        onSelect={(video) => void handleBunnyPick(video)}
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Loading testimonials…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-white/15 dark:bg-white/[0.03]">
          <Video className="mx-auto h-10 w-10 text-plum-500 dark:text-gold-400" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            Add your first testimonial
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            Pick a video from the Bunny “testimonial” collection to start. It stays as a draft until
            you publish it.
          </p>
          <Button
            type="button"
            className="mt-6 bg-plum-700 text-white hover:bg-plum-600"
            onClick={() => setPickerOpen(true)}
          >
            <Plus className="me-2 h-4 w-4" aria-hidden />
            Add testimonial
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={(e) => void onDragEnd(e)}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {rows.map((row, index) => (
                <SortableTestimonialRow
                  key={row.id}
                  row={row}
                  index={index}
                  busy={busyId === row.id}
                  onEdit={() => setEditing(row)}
                  onPreview={() => setPreview(row)}
                  onFeature={() => void setFeatured(row)}
                  onTogglePublish={() => void togglePublish(row)}
                  onDelete={() => setDeleteTarget(row)}
                />
              ))}
            </ul>
          </SortableContext>
          {typeof document !== 'undefined'
            ? createPortal(
                <DragOverlay>
                  {activeRow ? (
                    <div className="rounded-2xl border border-plum-300 bg-white p-3 shadow-xl dark:border-gold-400/40 dark:bg-[#181124]">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {activeRow.person_name_en || activeRow.video_title || 'Testimonial'}
                      </p>
                    </div>
                  ) : null}
                </DragOverlay>,
                document.body
              )
            : null}
        </DndContext>
      )}

      <TestimonialEditDialog
        open={Boolean(editing)}
        testimonial={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSaved={(updated) => {
          setRows((current) =>
            current.map((r) => {
              if (r.id === updated.id) return updated;
              if (updated.is_featured) return { ...r, is_featured: false };
              return r;
            })
          );
          setEditing(null);
        }}
      />

      <PageSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <TestimonialPreviewModal
        open={Boolean(preview)}
        testimonial={preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this testimonial?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from the Success Stories page. The Bunny video itself is not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SortableTestimonialRow({
  row,
  index,
  busy,
  onEdit,
  onPreview,
  onFeature,
  onTogglePublish,
  onDelete,
}: {
  row: AdminTestimonialDto;
  index: number;
  busy: boolean;
  onEdit: () => void;
  onPreview: () => void;
  onFeature: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const thumb = row.custom_thumbnail_url || row.thumbnail_url;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]',
        isDragging && 'opacity-60 shadow-lg'
      )}
    >
      <button
        type="button"
        className="inline-flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 active:cursor-grabbing dark:hover:bg-white/10 dark:hover:text-gray-200"
        aria-label={`Drag to reorder testimonial ${index + 1}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>

      <span className="w-6 shrink-0 text-center text-xs font-bold text-gray-400">{index + 1}</span>

      <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-white/10">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Video className="h-5 w-5 text-gray-400" aria-hidden />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {row.person_name_en || row.person_name_ar || row.video_title || 'Untitled'}
          </p>
          {row.is_featured ? (
            <Badge variant="warning" className="gap-1">
              <Star className="h-3 w-3" aria-hidden />
              Featured
            </Badge>
          ) : null}
          <Badge variant={row.is_published ? 'success' : 'secondary'}>
            {row.is_published ? 'Published' : 'Draft'}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
          {row.caption_en || row.caption_ar || row.video_title || '—'}
          {row.duration_seconds > 0 ? ` · ${formatDuration(row.duration_seconds)}` : ''}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1">
        <Button type="button" size="sm" variant="ghost" onClick={onPreview} disabled={busy}>
          <Play className="me-1 h-3.5 w-3.5" aria-hidden />
          Preview
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onEdit} disabled={busy}>
          <Pencil className="me-1 h-3.5 w-3.5" aria-hidden />
          Edit
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onFeature}
          disabled={busy || row.is_featured}
        >
          <Star className="me-1 h-3.5 w-3.5" aria-hidden />
          Set as featured
        </Button>
        <div className="flex items-center gap-1.5 px-2">
          <Switch
            checked={row.is_published}
            onCheckedChange={onTogglePublish}
            disabled={busy}
            aria-label={row.is_published ? 'Unpublish' : 'Publish'}
          />
          <span className="text-xs text-gray-500">Publish</span>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onDelete} disabled={busy}>
          <Trash2 className="h-3.5 w-3.5 text-red-600" aria-hidden />
        </Button>
      </div>
    </li>
  );
}
