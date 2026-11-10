'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  fetchSuccessStoriesPageSettings,
  updateSuccessStoriesPageSettings,
} from '@/lib/admin/api';
import type { SuccessStoriesPageDto } from '@/lib/admin/types';
import { ApiError } from '@/lib/api';

const EMPTY: SuccessStoriesPageDto = {
  id: 0,
  hero_title_en: '',
  hero_title_ar: '',
  hero_subtitle_en: '',
  hero_subtitle_ar: '',
  cta_title_en: '',
  cta_title_ar: '',
  cta_button_en: '',
  cta_button_ar: '',
  cta_link: '/courses',
};

export function PageSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<SuccessStoriesPageDto>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const page = await fetchSuccessStoriesPageSettings();
        if (!cancelled) setForm({ ...EMPTY, ...page, cta_link: page.cta_link || '/courses' });
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : 'Could not load page settings.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const setField = <K extends keyof SuccessStoriesPageDto>(key: K, value: SuccessStoriesPageDto[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = await updateSuccessStoriesPageSettings({
        hero_title_en: form.hero_title_en,
        hero_title_ar: form.hero_title_ar,
        hero_subtitle_en: form.hero_subtitle_en,
        hero_subtitle_ar: form.hero_subtitle_ar,
        cta_title_en: form.cta_title_en,
        cta_title_ar: form.cta_title_ar,
        cta_button_en: form.cta_button_en,
        cta_button_ar: form.cta_button_ar,
        cta_link: form.cta_link || '/courses',
      });
      setForm(saved);
      toast.success('Page settings saved.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Success Stories page settings</DialogTitle>
          <DialogDescription>
            Hero and final CTA copy for the public /success-stories page (EN + AR).
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading…
          </div>
        ) : (
          <div className="grid max-h-[60vh] gap-3 overflow-y-auto sm:grid-cols-2">
            <Field label="Hero title (EN)">
              <Input
                value={form.hero_title_en || ''}
                onChange={(e) => setField('hero_title_en', e.target.value)}
              />
            </Field>
            <Field label="Hero title (AR)">
              <Input
                dir="rtl"
                value={form.hero_title_ar || ''}
                onChange={(e) => setField('hero_title_ar', e.target.value)}
              />
            </Field>
            <Field label="Hero subtitle (EN)">
              <Textarea
                rows={3}
                value={form.hero_subtitle_en || ''}
                onChange={(e) => setField('hero_subtitle_en', e.target.value)}
              />
            </Field>
            <Field label="Hero subtitle (AR)">
              <Textarea
                dir="rtl"
                rows={3}
                value={form.hero_subtitle_ar || ''}
                onChange={(e) => setField('hero_subtitle_ar', e.target.value)}
              />
            </Field>
            <Field label="CTA title (EN)">
              <Input
                value={form.cta_title_en || ''}
                onChange={(e) => setField('cta_title_en', e.target.value)}
              />
            </Field>
            <Field label="CTA title (AR)">
              <Input
                dir="rtl"
                value={form.cta_title_ar || ''}
                onChange={(e) => setField('cta_title_ar', e.target.value)}
              />
            </Field>
            <Field label="CTA button (EN)">
              <Input
                value={form.cta_button_en || ''}
                onChange={(e) => setField('cta_button_en', e.target.value)}
              />
            </Field>
            <Field label="CTA button (AR)">
              <Input
                dir="rtl"
                value={form.cta_button_ar || ''}
                onChange={(e) => setField('cta_button_ar', e.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="CTA link (path, default /courses)">
                <Input
                  value={form.cta_link || '/courses'}
                  onChange={(e) => setField('cta_link', e.target.value)}
                  placeholder="/courses"
                />
              </Field>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading || saving}
            onClick={() => void save()}
            className="bg-plum-700 text-white hover:bg-plum-600"
          >
            {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Save settings
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
