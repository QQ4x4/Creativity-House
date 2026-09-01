'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';
import { GripVertical, Plus, Trash2 } from 'lucide-react';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { CourseFormValues } from '@/lib/admin/schema';
import type {
  BooleanFieldPath,
  BulletFieldPath,
  NumberFieldPath,
  StringFieldPath,
} from './field-paths';

/* ─── Text ───────────────────────────────────────────────────────────────── */

interface TextFieldProps {
  name: StringFieldPath;
  label: string;
  description?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  type?: 'text' | 'date' | 'url';
  dir?: 'rtl' | 'ltr';
}

export function TextField({
  name,
  label,
  description,
  placeholder,
  multiline = false,
  rows = 5,
  type = 'text',
  dir,
}: TextFieldProps) {
  const { control } = useFormContext<CourseFormValues>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {multiline ? (
              <Textarea {...field} rows={rows} placeholder={placeholder} dir={dir} />
            ) : (
              <Input {...field} type={type} placeholder={placeholder} dir={dir} />
            )}
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/* ─── Number ─────────────────────────────────────────────────────────────── */

interface NumberFieldProps {
  name: NumberFieldPath;
  label: string;
  description?: string;
  placeholder?: string;
  step?: string;
  min?: number;
  max?: number;
  /** When true an emptied input stores null instead of 0. */
  nullable?: boolean;
}

export function NumberField({
  name,
  label,
  description,
  placeholder,
  step = '1',
  min,
  max,
  nullable = false,
}: NumberFieldProps) {
  const { control } = useFormContext<CourseFormValues>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              inputMode="decimal"
              step={step}
              min={min}
              max={max}
              placeholder={placeholder}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              // Keep form state numeric — the schema expects real numbers.
              value={field.value === null || field.value === undefined ? '' : String(field.value)}
              onChange={(event) => {
                const raw = event.target.value;
                if (raw === '') {
                  field.onChange(nullable ? null : 0);
                  return;
                }
                const parsed = Number(raw);
                field.onChange(Number.isNaN(parsed) ? (nullable ? null : 0) : parsed);
              }}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/* ─── Bilingual pair ─────────────────────────────────────────────────────── */

interface BilingualFieldProps {
  nameEn: StringFieldPath;
  nameAr: StringFieldPath;
  label: string;
  description?: string;
  placeholderEn?: string;
  placeholderAr?: string;
  multiline?: boolean;
  rows?: number;
}

/**
 * Side-by-side English / Arabic inputs. The Arabic column forces `dir="rtl"`
 * so the admin previews the text the way the public page renders it.
 */
export function BilingualField({
  nameEn,
  nameAr,
  label,
  description,
  placeholderEn,
  placeholderAr,
  multiline = false,
  rows = 5,
}: BilingualFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
        {description ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          name={nameEn}
          label="English"
          placeholder={placeholderEn}
          multiline={multiline}
          rows={rows}
        />
        <TextField
          name={nameAr}
          label="العربية"
          placeholder={placeholderAr}
          multiline={multiline}
          rows={rows}
          dir="rtl"
        />
      </div>
    </div>
  );
}

/* ─── Dynamic bullet list ────────────────────────────────────────────────── */

interface BulletListProps {
  name: BulletFieldPath;
  label: string;
  addLabel?: string;
  placeholder?: string;
  emptyHint?: string;
  dir?: 'rtl' | 'ltr';
}

/**
 * Add/remove list backed by useFieldArray. Items are `{ value }` objects so
 * each row keeps a stable key while the list is edited.
 */
export function BulletList({
  name,
  label,
  addLabel = 'Add item',
  placeholder,
  emptyHint = 'No items yet.',
  dir,
}: BulletListProps) {
  const { control, register } = useFormContext<CourseFormValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name });

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>

      {fields.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 px-3 py-4 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
          {emptyHint}
        </p>
      ) : (
        <ul className="space-y-2">
          {fields.map((field, index) => (
            <li key={field.id} className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => move(index, Math.max(0, index - 1))}
                disabled={index === 0}
                aria-label={`Move ${label} item ${index + 1} up`}
                className="mt-2.5 cursor-pointer text-gray-300 transition-colors hover:text-plum-500 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-600 dark:hover:text-gold-300"
              >
                <GripVertical className="h-4 w-4" aria-hidden />
              </button>

              <div className="flex-1">
                <Input
                  {...register(`${name}.${index}.value` as const)}
                  placeholder={placeholder}
                  dir={dir}
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                aria-label={`Remove ${label} item ${index + 1}`}
                className="mt-0.5 shrink-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ value: '' })}
        className="mt-1"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        {addLabel}
      </Button>
    </div>
  );
}

/* ─── Bilingual bullet pair ──────────────────────────────────────────────── */

interface BilingualBulletListProps {
  nameEn: BulletFieldPath;
  nameAr: BulletFieldPath;
  label: string;
  description?: string;
  addLabel?: string;
}

export function BilingualBulletList({
  nameEn,
  nameAr,
  label,
  description,
  addLabel,
}: BilingualBulletListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
        {description ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        ) : null}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <BulletList name={nameEn} label="English" addLabel={addLabel} />
        <BulletList name={nameAr} label="العربية" addLabel={addLabel} dir="rtl" />
      </div>
    </div>
  );
}

/* ─── Switch row ─────────────────────────────────────────────────────────── */

interface ToggleFieldProps {
  name: BooleanFieldPath;
  label: string;
  description?: string;
  children: (props: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => React.ReactNode;
}

/**
 * Render-prop wrapper so callers can drop in either a Switch or a Checkbox
 * while keeping the FormField wiring and error message in one place.
 */
export function ToggleField({ name, label, description, children }: ToggleFieldProps) {
  const { control } = useFormContext<CourseFormValues>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-start justify-between gap-4 rounded-2xl border border-gray-200 p-4 dark:border-white/10">
          <div className="space-y-1">
            <FormLabel className="cursor-pointer">{label}</FormLabel>
            {description ? <FormDescription>{description}</FormDescription> : null}
            <FormMessage />
          </div>
          {children({ checked: field.value, onCheckedChange: field.onChange })}
        </FormItem>
      )}
    />
  );
}
