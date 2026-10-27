'use client';

import type { ControllerRenderProps, FieldPath, FieldValues } from 'react-hook-form';

import { Input } from '@/components/ui/input';

interface ScheduleNumberInputProps<T extends FieldValues> {
  field: ControllerRenderProps<T, FieldPath<T>>;
  min?: number;
  max?: number;
  step?: string;
  placeholder?: string;
  /** Empty → null. Required numeric fields should pass false (empty → 0). */
  nullable?: boolean;
  className?: string;
  id?: string;
}

/**
 * Same conversion as admin NumberField: keep RHF state as real numbers so zod
 * `z.number()` does not reject the string that `<input type="number">` emits.
 */
export function ScheduleNumberInput<T extends FieldValues>({
  field,
  min,
  max,
  step = '1',
  placeholder,
  nullable = false,
  className,
  id,
}: ScheduleNumberInputProps<T>) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      max={max}
      placeholder={placeholder}
      className={className}
      name={field.name}
      ref={field.ref}
      onBlur={field.onBlur}
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
  );
}
