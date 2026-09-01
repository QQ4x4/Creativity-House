import type { FieldPath, FieldPathValue } from 'react-hook-form';

import type { CourseFormValues } from '@/lib/admin/schema';

/**
 * Path helpers that narrow `FieldPath<CourseFormValues>` down to the paths
 * whose value has a given type.
 *
 * Without these, a shared <TextField name="price" /> would compile and then
 * feed a number into a text input at runtime.
 */
type PathsOfType<TValue> = {
  [K in FieldPath<CourseFormValues>]: FieldPathValue<CourseFormValues, K> extends TValue ? K : never;
}[FieldPath<CourseFormValues>];

export type StringFieldPath = PathsOfType<string>;
export type NumberFieldPath = PathsOfType<number | null>;
export type BooleanFieldPath = PathsOfType<boolean>;
export type BulletFieldPath = PathsOfType<{ value: string }[]>;
