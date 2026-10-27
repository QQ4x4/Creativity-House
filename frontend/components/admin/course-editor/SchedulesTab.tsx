'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
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
import {
  deleteAdminOccurrence,
  deleteAdminSchedule,
  duplicateAdminSchedule,
  fetchAdminSchedule,
  fetchAdminScheduleOccurrences,
  fetchAdminSchedules,
  updateAdminSchedule,
  upsertAdminOccurrence,
} from '@/lib/admin/api';
import {
  scheduleToFormValues,
  toSchedulePayload,
} from '@/lib/admin/scheduleSchema';
import type {
  AdminCourseScheduleDto,
  AdminOccurrenceDto,
  DeliveryMode,
} from '@/lib/admin/types';
import { ApiError } from '@/lib/api';
import { todayInTimeZone } from '@/lib/catalog/scheduleTime';
import { cn } from '@/lib/utils';

import { OccurrenceDialog } from './schedules/OccurrenceDialog';
import { ScheduleDialog } from './schedules/ScheduleDialog';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface SchedulesTabProps {
  courseId: number | null;
  currency: string;
  availableModes: DeliveryMode[];
  courseInstructor?: {
    instructor_name: string | null;
    instructor_name_ar: string | null;
    instructor_title_en: string | null;
    instructor_title_ar: string | null;
    instructor_photo: string | null;
  } | null;
}

function summarizeRule(schedule: AdminCourseScheduleDto): string {
  const time = `${schedule.start_time}–${schedule.end_time}`;
  const days =
    schedule.duration_days > 1 ? `${schedule.duration_days}-day batch` : '1-day batch';

  switch (schedule.recurrence_type) {
    case 'once':
      return `Once on ${schedule.starts_on} · ${days} · ${time}`;
    case 'weekly': {
      const daysLabel = (schedule.weekdays ?? [])
        .map((d) => WEEKDAY[d] ?? d)
        .join(', ');
      const every =
        schedule.repeat_interval > 1
          ? `every ${schedule.repeat_interval} weeks`
          : 'every week';
      return `${every} on ${daysLabel || '—'} · ${days} · ${time}`;
    }
    case 'monthly_days': {
      const nums = (schedule.month_days ?? []).join(', ');
      const every =
        schedule.repeat_interval > 1
          ? `every ${schedule.repeat_interval} months`
          : 'every month';
      return `${every} on day ${nums || '—'} · ${days} · ${time}`;
    }
    case 'custom_dates': {
      const count = schedule.custom_dates?.length ?? 0;
      return `${count} specific date${count === 1 ? '' : 's'}${
        schedule.repeat_custom_monthly ? ' (repeats monthly)' : ''
      } · ${days} · ${time}`;
    }
    default:
      return `${days} · ${time}`;
  }
}

export function SchedulesTab({
  courseId,
  currency,
  availableModes,
  courseInstructor = null,
}: SchedulesTabProps) {
  const [schedules, setSchedules] = useState<AdminCourseScheduleDto[]>([]);
  const [upcoming, setUpcoming] = useState<AdminOccurrenceDto[]>([]);
  const [suggestedBatchNumber, setSuggestedBatchNumber] = useState(1);
  const [usedBatchNumbers, setUsedBatchNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCourseScheduleDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCourseScheduleDto | null>(null);
  const [occurrenceEdit, setOccurrenceEdit] = useState<AdminOccurrenceDto | null>(null);

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const { schedules: rows, suggestedBatchNumber: suggested, usedBatchNumbers: used } =
        await fetchAdminSchedules(courseId);
      setSchedules(rows);
      setSuggestedBatchNumber(suggested);
      setUsedBatchNumbers(used);

      const all: AdminOccurrenceDto[] = [];
      await Promise.all(
        rows.map(async (schedule) => {
          const occs = await fetchAdminScheduleOccurrences(courseId, schedule.id, {
            limit: 40,
          });
          all.push(...occs);
        })
      );
      all.sort((a, b) => a.start_at.localeCompare(b.start_at));
      // Roughly next 3 months of dates for the table.
      const horizon = Date.now() + 90 * 24 * 60 * 60 * 1000;
      setUpcoming(all.filter((o) => new Date(o.start_at).getTime() <= horizon));
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Could not load schedules.'
      );
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (schedule: AdminCourseScheduleDto) => {
    setEditing(schedule);
    setDialogOpen(true);
    // Re-fetch the rule so the dialog always opens with server truth
    // (dates Y-m-d, times H:i, resolved trainer photo URL, etc.).
    if (!courseId) return;
    void fetchAdminSchedule(courseId, schedule.id)
      .then((fresh) => {
        setEditing(fresh);
      })
      .catch(() => {
        // Keep the list row if the show call fails.
      });
  };

  const toggleActive = async (schedule: AdminCourseScheduleDto) => {
    const next = !schedule.is_active;
    setSchedules((prev) =>
      prev.map((s) => (s.id === schedule.id ? { ...s, is_active: next } : s))
    );
    try {
      // Update expects a full rule body (same as the dialog save).
      await updateAdminSchedule(courseId!, schedule.id, {
        ...toSchedulePayload(scheduleToFormValues(schedule)),
        is_active: next,
      });
      toast.success(next ? 'Schedule activated.' : 'Schedule deactivated.');
      await load();
    } catch (error) {
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === schedule.id ? { ...s, is_active: schedule.is_active } : s
        )
      );
      toast.error(error instanceof ApiError ? error.message : 'Could not update status.');
    }
  };

  const toggleFeatured = async (schedule: AdminCourseScheduleDto) => {
    const next = !schedule.is_featured;
    setSchedules((prev) =>
      prev.map((s) => (s.id === schedule.id ? { ...s, is_featured: next } : s))
    );
    try {
      await updateAdminSchedule(courseId!, schedule.id, {
        ...toSchedulePayload(scheduleToFormValues(schedule)),
        is_featured: next,
      });
      await load();
    } catch (error) {
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === schedule.id ? { ...s, is_featured: schedule.is_featured } : s
        )
      );
      toast.error(error instanceof ApiError ? error.message : 'Could not update featured.');
    }
  };

  const onDuplicate = async (schedule: AdminCourseScheduleDto) => {
    try {
      await duplicateAdminSchedule(courseId!, schedule.id);
      toast.success('Schedule duplicated as inactive.');
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not duplicate.');
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget || !courseId) return;
    try {
      await deleteAdminSchedule(courseId, deleteTarget.id);
      toast.success('Schedule deleted.');
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not delete.');
    }
  };

  const quickStatus = async (
    occurrence: AdminOccurrenceDto,
    status: 'cancelled' | 'sold_out'
  ) => {
    try {
      await upsertAdminOccurrence(courseId!, occurrence.schedule_id, occurrence.occurrence_date, {
        status,
      });
      toast.success(status === 'cancelled' ? 'Date cancelled.' : 'Date marked sold out.');
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not update date.');
    }
  };

  const restoreOccurrence = async (occurrence: AdminOccurrenceDto) => {
    try {
      await deleteAdminOccurrence(courseId!, occurrence.schedule_id, occurrence.occurrence_date);
      toast.success('Date restored to the rule defaults.');
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not restore date.');
    }
  };

  const scheduleById = useMemo(() => {
    const map = new Map<number, AdminCourseScheduleDto>();
    schedules.forEach((s) => map.set(s.id, s));
    return map;
  }, [schedules]);

  if (!courseId) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-white/15 dark:bg-white/5">
        <CalendarDays className="mx-auto h-10 w-10 text-gray-400" aria-hidden />
        <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
          Save the course first to add schedules
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Schedules are saved immediately through their own API and need a course id.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Schedules</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Changes in this tab are saved immediately — they are not part of the main course Save
            button.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden />
          Add schedule
        </Button>
      </div>

      {loading && schedules.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading schedules…
        </div>
      ) : null}

      {!loading && schedules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center dark:border-white/15">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            No batch rules yet. Add a weekly, monthly, or one-off schedule for this course.
          </p>
          <Button type="button" className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Add schedule
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <article
              key={schedule.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={schedule.is_active ? 'success' : 'secondary'}>
                      {schedule.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {schedule.is_featured ? <Badge variant="warning">Featured</Badge> : null}
                    {schedule.delivery_mode ? (
                      <Badge>{schedule.delivery_mode}</Badge>
                    ) : (
                      <Badge variant="secondary">All modes</Badge>
                    )}
                    {schedule.price != null ? (
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {currency} {schedule.price}
                        {schedule.original_price != null &&
                        schedule.original_price > schedule.price ? (
                          <span className="ms-1 text-xs font-normal text-gray-400 line-through">
                            {schedule.original_price}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Course price</span>
                    )}
                  </div>
                  <h3 className="truncate text-base font-semibold text-gray-900 dark:text-white">
                    {schedule.title_en ||
                      (schedule.batch_number != null ? `Batch ${schedule.batch_number}` : null) ||
                      summarizeRule(schedule)}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {summarizeRule(schedule)}
                    {schedule.timezone ? ` · ${schedule.timezone}` : ''}
                  </p>
                  {(schedule.next_occurrences?.length ?? 0) > 0 ? (
                    <p className="text-xs text-gray-500">
                      Next:{' '}
                      {schedule.next_occurrences!
                        .slice(0, 3)
                        .map((o) => o.occurrence_date)
                        .join(' · ')}
                      {typeof schedule.seats_sold === 'number'
                        ? ` · ${schedule.seats_sold} sold`
                        : ''}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-2 py-1 dark:border-white/10">
                    <span className="text-xs text-gray-500">Active</span>
                    <Switch
                      checked={schedule.is_active}
                      onCheckedChange={() => void toggleActive(schedule)}
                      aria-label="Toggle active"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={schedule.is_featured ? 'default' : 'secondary'}
                    onClick={() => void toggleFeatured(schedule)}
                    aria-pressed={schedule.is_featured}
                  >
                    <Star className="h-4 w-4" aria-hidden />
                    Featured
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(schedule)}>
                    <Pencil className="h-4 w-4" aria-hidden />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void onDuplicate(schedule)}
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                    Duplicate
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteTarget(schedule)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Delete
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Upcoming dates</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Next ~3 months across all rules. Edit, cancel, or mark a single date sold out without
            changing the rule.
          </p>
        </div>

        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming dates yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-start text-xs uppercase tracking-wide text-gray-500 dark:bg-white/5">
                <tr>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Time</th>
                  <th className="px-3 py-2 font-semibold">Rule</th>
                  <th className="px-3 py-2 font-semibold">Price</th>
                  <th className="px-3 py-2 font-semibold">Seats</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((occ) => {
                  const rule = scheduleById.get(occ.schedule_id);
                  const todayYmd = todayInTimeZone(occ.timezone || rule?.timezone || 'UTC');
                  const isPast = occ.occurrence_date < todayYmd;
                  return (
                    <tr
                      key={`${occ.schedule_id}-${occ.occurrence_date}`}
                      className="border-t border-gray-100 dark:border-white/5"
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        {occ.local_start_date}
                        {occ.local_end_date !== occ.local_start_date
                          ? ` → ${occ.local_end_date}`
                          : ''}
                        {isPast ? (
                          <Badge className="ms-2" variant="secondary">
                            Past
                          </Badge>
                        ) : null}
                        {occ.is_exception ? (
                          <Badge className="ms-2" variant="warning">
                            Modified
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {occ.start_time}–{occ.end_time}
                      </td>
                      <td className="px-3 py-2">
                        {rule?.title_en ||
                          (occ.batch_number != null
                            ? `Batch ${occ.batch_number}`
                            : rule?.batch_number != null
                              ? `Batch ${rule.batch_number}`
                              : null) ||
                          `#${occ.schedule_id}`}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {occ.currency} {occ.price}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {occ.seats_total != null
                          ? `${occ.seats_taken ?? 0}/${occ.seats_total}`
                          : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            occ.status === 'open' && 'bg-emerald-50 text-emerald-700',
                            occ.status === 'few_seats' && 'bg-amber-50 text-amber-800',
                            (occ.status === 'sold_out' || occ.status === 'cancelled') &&
                              'bg-red-50 text-red-700',
                            occ.status === 'closed' && 'bg-gray-100 text-gray-600'
                          )}
                        >
                          {occ.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {isPast ? (
                          <span className="text-xs text-gray-400">Read-only</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setOccurrenceEdit(occ)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => void quickStatus(occ, 'cancelled')}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => void quickStatus(occ, 'sold_out')}
                            >
                              Sold out
                            </Button>
                            {occ.is_exception ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => void restoreOccurrence(occ)}
                              >
                                Restore
                              </Button>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        courseId={courseId}
        currency={currency}
        availableModes={availableModes}
        schedule={editing}
        onSaved={() => void load()}
        courseInstructor={courseInstructor}
        suggestedBatchNumber={suggestedBatchNumber}
        usedBatchNumbers={usedBatchNumbers}
      />

      <OccurrenceDialog
        open={Boolean(occurrenceEdit)}
        onOpenChange={(open) => {
          if (!open) setOccurrenceEdit(null);
        }}
        courseId={courseId}
        occurrence={occurrenceEdit}
        onSaved={() => void load()}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              The rule will be soft-deleted. Paid orders that reference it keep their history.
              {deleteTarget?.seats_sold
                ? ` This rule already has ${deleteTarget.seats_sold} paid seat(s).`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onConfirmDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
