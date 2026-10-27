'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { upsertAdminOccurrence } from '@/lib/admin/api';
import {
  occurrenceFormSchema,
  type OccurrenceFormValues,
} from '@/lib/admin/scheduleSchema';
import type { AdminOccurrenceDto } from '@/lib/admin/types';
import { ApiError } from '@/lib/api';

import { ScheduleNumberInput } from './ScheduleNumberInput';

interface OccurrenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number;
  occurrence: AdminOccurrenceDto | null;
  onSaved: () => void;
}

export function OccurrenceDialog({
  open,
  onOpenChange,
  courseId,
  occurrence,
  onSaved,
}: OccurrenceDialogProps) {
  const form = useForm<OccurrenceFormValues>({
    resolver: zodResolver(occurrenceFormSchema),
    defaultValues: {
      status: 'modified',
      start_time: null,
      end_time: null,
      duration_days: null,
      price: null,
      original_price: null,
      seats_total: null,
      batch_number: null,
      trainer_name_en: null,
      trainer_name_ar: null,
      trainer_photo: null,
      note_en: null,
      note_ar: null,
    },
  });

  useEffect(() => {
    if (!occurrence || !open) return;

    const toTime = (value: string | null | undefined): string | null => {
      if (!value) return null;
      const match = String(value).match(/(\d{1,2}):(\d{2})/);
      return match ? `${match[1].padStart(2, '0')}:${match[2]}` : null;
    };

    form.reset({
      status: occurrence.is_exception
        ? occurrence.status === 'cancelled'
          ? 'cancelled'
          : occurrence.status === 'sold_out'
            ? 'sold_out'
            : 'modified'
        : 'modified',
      // Blank override fields when this date still uses the rule defaults —
      // pre-filling schedule times would look like a saved override.
      // Trainer stays blank unless we only want an explicit override — never
      // seed the resolved course-instructor fallback into exception fields.
      start_time: occurrence.is_exception ? toTime(occurrence.start_time) : null,
      end_time: occurrence.is_exception ? toTime(occurrence.end_time) : null,
      duration_days: occurrence.is_exception ? occurrence.duration_days : null,
      price: occurrence.is_exception ? occurrence.price : null,
      original_price: occurrence.is_exception ? occurrence.original_price : null,
      seats_total: occurrence.is_exception ? occurrence.seats_total : null,
      batch_number: occurrence.batch_number_override ?? null,
      trainer_name_en: occurrence.trainer_override?.name_en ?? null,
      trainer_name_ar: occurrence.trainer_override?.name_ar ?? null,
      trainer_photo: occurrence.trainer_override?.photo ?? null,
      note_en: occurrence.is_exception ? occurrence.note_en : null,
      note_ar: occurrence.is_exception ? occurrence.note_ar : null,
    });
  }, [occurrence, open, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!occurrence) return;
    try {
      await upsertAdminOccurrence(courseId, occurrence.schedule_id, occurrence.occurrence_date, {
        ...values,
        start_time: values.start_time || null,
        end_time: values.end_time || null,
      });
      toast.success('Date override saved.');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Could not save this date override.'
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit this date</DialogTitle>
          <DialogDescription>
            {occurrence
              ? `Overrides for ${occurrence.occurrence_date}. Leave a field blank to keep the rule’s value.`
              : 'Overrides for one generated batch.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="modified">Modified (keep open)</SelectItem>
                      <SelectItem value="sold_out">Sold out</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start time</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End time</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="duration_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days</FormLabel>
                    <FormControl>
                      <ScheduleNumberInput field={field} min={1} max={365} nullable />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <ScheduleNumberInput field={field} min={0} step="0.01" nullable />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="seats_total"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seats</FormLabel>
                    <FormControl>
                      <ScheduleNumberInput field={field} min={1} nullable />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="batch_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batch number override</FormLabel>
                  <FormControl>
                    <ScheduleNumberInput field={field} min={1} nullable placeholder="Keep series number" />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to keep the automatic series number
                    {occurrence?.batch_number != null ? ` (currently ${occurrence.batch_number})` : ''}.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trainer_name_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trainer (EN)</FormLabel>
                  <FormControl>
                    <Input
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trainer_photo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trainer photo</FormLabel>
                  <ImageUploader
                    variant="avatar"
                    label="Upload trainer photo"
                    value={field.value}
                    onUploaded={(url) =>
                      form.setValue('trainer_photo', url, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    onCleared={() =>
                      form.setValue('trainer_photo', null, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (EN)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                Save override
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
