'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';

import { BunnyVideoPicker, formatDuration } from '@/components/admin/course-editor/BunnyVideoPicker';
import { ImageUploader } from '@/components/admin/ImageUploader';
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
import { Textarea } from '@/components/ui/textarea';
import {
  fetchAdminCourses,
  updateAdminTestimonial,
} from '@/lib/admin/api';
import type { AdminCourseDto, AdminTestimonialDto, BunnyVideo } from '@/lib/admin/types';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

type FormState = {
  bunny_video_id: string;
  bunny_collection_id: string | null;
  video_title: string;
  duration_seconds: number;
  orientation: 'landscape' | 'portrait';
  person_name_en: string;
  person_name_ar: string;
  person_role_en: string;
  person_role_ar: string;
  country: string;
  course_id: string;
  caption_en: string;
  caption_ar: string;
  quote_en: string;
  quote_ar: string;
  custom_thumbnail_path: string;
  custom_thumbnail_url: string;
  is_featured: boolean;
  is_published: boolean;
};

function fromDto(row: AdminTestimonialDto): FormState {
  return {
    bunny_video_id: row.bunny_video_id,
    bunny_collection_id: row.bunny_collection_id,
    video_title: row.video_title || '',
    duration_seconds: row.duration_seconds || 0,
    orientation: row.orientation || 'landscape',
    person_name_en: row.person_name_en || '',
    person_name_ar: row.person_name_ar || '',
    person_role_en: row.person_role_en || '',
    person_role_ar: row.person_role_ar || '',
    country: row.country || '',
    course_id: row.course_id != null ? String(row.course_id) : '',
    caption_en: row.caption_en || '',
    caption_ar: row.caption_ar || '',
    quote_en: row.quote_en || '',
    quote_ar: row.quote_ar || '',
    custom_thumbnail_path: row.custom_thumbnail_path || '',
    custom_thumbnail_url: row.custom_thumbnail_url || row.thumbnail_url || '',
    is_featured: row.is_featured,
    is_published: row.is_published,
  };
}

export function TestimonialEditDialog({
  open,
  testimonial,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  testimonial: AdminTestimonialDto | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (row: AdminTestimonialDto) => void;
}) {
  const [form, setForm] = useState<FormState | null>(null);
  const [previewLang, setPreviewLang] = useState<'en' | 'ar'>('en');
  const [courses, setCourses] = useState<AdminCourseDto[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !testimonial) {
      setForm(null);
      return;
    }
    setForm(fromDto(testimonial));
    setPreviewLang('en');
  }, [open, testimonial]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchAdminCourses();
        if (!cancelled) setCourses(list);
      } catch {
        // course select is optional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const preview = useMemo(() => {
    if (!form) return null;
    const ar = previewLang === 'ar';
    return {
      name: ar ? form.person_name_ar || form.person_name_en : form.person_name_en || form.person_name_ar,
      role: ar ? form.person_role_ar || form.person_role_en : form.person_role_en || form.person_role_ar,
      caption: ar ? form.caption_ar || form.caption_en : form.caption_en || form.caption_ar,
      quote: ar ? form.quote_ar || form.quote_en : form.quote_en || form.quote_ar,
      thumb: form.custom_thumbnail_url,
    };
  }, [form, previewLang]);

  if (!testimonial || !form) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit testimonial</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const onVideoSelect = (video: BunnyVideo) => {
    setForm((current) =>
      current
        ? {
            ...current,
            bunny_video_id: video.guid,
            bunny_collection_id: video.collection_id,
            video_title: video.title,
            duration_seconds: video.duration,
            orientation: video.orientation || 'landscape',
            custom_thumbnail_url: current.custom_thumbnail_path
              ? current.custom_thumbnail_url
              : video.thumbnail_url || current.custom_thumbnail_url,
          }
        : current
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateAdminTestimonial(testimonial.id, {
        bunny_video_id: form.bunny_video_id,
        bunny_collection_id: form.bunny_collection_id,
        video_title: form.video_title || null,
        duration_seconds: form.duration_seconds,
        orientation: form.orientation,
        person_name_en: form.person_name_en || null,
        person_name_ar: form.person_name_ar || null,
        person_role_en: form.person_role_en || null,
        person_role_ar: form.person_role_ar || null,
        country: form.country || null,
        course_id: form.course_id ? Number(form.course_id) : null,
        caption_en: form.caption_en || null,
        caption_ar: form.caption_ar || null,
        quote_en: form.quote_en || null,
        quote_ar: form.quote_ar || null,
        custom_thumbnail_path: form.custom_thumbnail_path || null,
        is_featured: form.is_featured,
        is_published: form.is_published,
      });
      toast.success('Testimonial saved.');
      onSaved(updated);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b border-gray-200 px-6 py-4 dark:border-white/10">
          <DialogTitle>Edit testimonial</DialogTitle>
          <DialogDescription>
            Person details, caption, and publishing. Live card preview on the right.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-6 py-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Video</Label>
              <BunnyVideoPicker
                selectedGuid={form.bunny_video_id}
                onSelect={onVideoSelect}
                title="Change Bunny video"
                description="Swap the video while keeping person details."
              />
              <p className="text-xs text-gray-500">
                {form.video_title || form.bunny_video_id}
                {form.duration_seconds > 0 ? ` · ${formatDuration(form.duration_seconds)}` : ''}
                {` · ${form.orientation}`}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Person name (EN)">
                <Input
                  value={form.person_name_en}
                  onChange={(e) => setField('person_name_en', e.target.value)}
                />
              </Field>
              <Field label="Person name (AR)">
                <Input
                  dir="rtl"
                  value={form.person_name_ar}
                  onChange={(e) => setField('person_name_ar', e.target.value)}
                />
              </Field>
              <Field label="Role (EN)">
                <Input
                  value={form.person_role_en}
                  onChange={(e) => setField('person_role_en', e.target.value)}
                  placeholder="Project Manager, Aramco"
                />
              </Field>
              <Field label="Role (AR)">
                <Input
                  dir="rtl"
                  value={form.person_role_ar}
                  onChange={(e) => setField('person_role_ar', e.target.value)}
                />
              </Field>
              <Field label="Country">
                <Input value={form.country} onChange={(e) => setField('country', e.target.value)} />
              </Field>
              <Field label="Related course">
                <select
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#181124]"
                  value={form.course_id}
                  onChange={(e) => setField('course_id', e.target.value)}
                >
                  <option value="">None</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title_en || course.title_ar || course.slug || `#${course.id}`}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Caption (EN)">
                <Input
                  value={form.caption_en}
                  onChange={(e) => setField('caption_en', e.target.value)}
                />
              </Field>
              <Field label="Caption (AR)">
                <Input
                  dir="rtl"
                  value={form.caption_ar}
                  onChange={(e) => setField('caption_ar', e.target.value)}
                />
              </Field>
            </div>

            <Field label="Quote (EN)">
              <Textarea
                rows={2}
                value={form.quote_en}
                onChange={(e) => setField('quote_en', e.target.value)}
              />
            </Field>
            <Field label="Quote (AR)">
              <Textarea
                dir="rtl"
                rows={2}
                value={form.quote_ar}
                onChange={(e) => setField('quote_ar', e.target.value)}
              />
            </Field>

            <ImageUploader
              label="Custom thumbnail (optional)"
              variant="cover"
              value={form.custom_thumbnail_url || null}
              onUploaded={(url) => setField('custom_thumbnail_url', url)}
              onUploadedMeta={({ path, url }) => {
                setField('custom_thumbnail_path', path);
                setField('custom_thumbnail_url', url);
              }}
              onCleared={() => {
                setField('custom_thumbnail_path', '');
                setField('custom_thumbnail_url', '');
              }}
            />

            <div className="flex flex-wrap gap-6">
              <label className="inline-flex items-center gap-2 text-sm">
                <Switch
                  checked={form.is_featured}
                  onCheckedChange={(v) => setField('is_featured', v)}
                />
                Featured
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <Switch
                  checked={form.is_published}
                  onCheckedChange={(v) => setField('is_published', v)}
                />
                Published
              </label>
            </div>
          </div>

          <aside className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Card preview</p>
              <div className="inline-flex rounded-full border border-gray-200 p-0.5 dark:border-white/10">
                {(['en', 'ar'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setPreviewLang(lang)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-semibold',
                      previewLang === lang
                        ? 'bg-plum-700 text-white'
                        : 'text-gray-600 dark:text-gray-300'
                    )}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <article
              dir={previewLang === 'ar' ? 'rtl' : 'ltr'}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#181124]"
            >
              <div className="relative aspect-video bg-gray-100 dark:bg-white/10">
                {preview?.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview.thumb} alt="" className="h-full w-full object-cover" />
                ) : null}
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-plum-700 to-gold-500 text-white shadow-lg">
                    <Play className="ms-0.5 h-5 w-5 fill-current" aria-hidden />
                  </span>
                </span>
              </div>
              <div className="space-y-1 p-3">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {preview?.name || 'Person name'}
                </p>
                <p className="text-xs text-gray-500">{preview?.role || 'Role'}</p>
                <p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-300">
                  {preview?.caption || 'Caption'}
                </p>
                {preview?.quote ? (
                  <p className="mt-2 border-s-2 border-gold-400 ps-2 text-xs italic text-gray-500">
                    “{preview.quote}”
                  </p>
                ) : null}
              </div>
            </article>
          </aside>
        </div>

        <DialogFooter className="shrink-0 border-t border-gray-200 px-6 py-4 dark:border-white/10">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="bg-plum-700 text-white hover:bg-plum-600"
          >
            {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
