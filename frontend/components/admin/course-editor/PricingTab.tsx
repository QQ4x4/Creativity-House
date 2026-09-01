'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DELIVERY_MODES, type DeliveryMode } from '@/lib/admin/types';
import type { CourseFormValues } from '@/lib/admin/schema';
import { NumberField, TextField } from './fields';

const MODE_LABELS: Record<DeliveryMode, string> = {
  live: 'Live',
  recorded: 'Recorded',
  simulator: 'Simulator',
};

export function PricingTab() {
  const { control } = useFormContext<CourseFormValues>();

  const price = useWatch({ control, name: 'price' });
  const originalPrice = useWatch({ control, name: 'original_price' });
  const availableModes = useWatch({ control, name: 'available_modes' });

  const discount =
    originalPrice !== null && originalPrice > price ? Math.round(originalPrice - price) : 0;
  const discountPercent =
    originalPrice !== null && originalPrice > 0 && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
          <CardDescription>
            The pricing card shows a strike-through and a savings pill whenever the original price
            is higher than the price.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <NumberField name="price" label="Price" step="0.01" min={0} placeholder="599" />
            <NumberField
              name="original_price"
              label="Original price"
              step="0.01"
              min={0}
              placeholder="799"
              nullable
              description="Leave empty for no discount."
            />
            <TextField name="currency" label="Currency" placeholder="USD" />
          </div>

          {discount > 0 ? (
            <Badge variant="success">
              Public page will show: Save ${discount} ({discountPercent}% off)
            </Badge>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No discount pill will be shown.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery modes</CardTitle>
          <CardDescription>
            Only the selected modes render as toggle buttons on the course page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={control}
            name="available_modes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Available delivery modes</FormLabel>
                <div className="flex flex-wrap gap-3">
                  {DELIVERY_MODES.map((mode) => {
                    const checked = field.value.includes(mode);

                    return (
                      <label
                        key={mode}
                        className="inline-flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 px-4 transition-colors hover:border-plum-300 dark:border-white/10 dark:hover:border-purple-400/40"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) => {
                            const set = new Set(field.value);
                            if (next === true) {
                              set.add(mode);
                            } else {
                              set.delete(mode);
                            }
                            // Preserve the canonical order the page renders in.
                            field.onChange(DELIVERY_MODES.filter((item) => set.has(item)));
                          }}
                        />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {MODE_LABELS[mode]}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="default_mode"
            render={({ field }) => (
              <FormItem className="max-w-sm">
                <FormLabel>Default selected mode</FormLabel>
                <Select
                  value={field.value ?? ''}
                  onValueChange={(value) => field.onChange(value === '' ? null : value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a default mode" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableModes.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        Select delivery modes first
                      </SelectItem>
                    ) : (
                      availableModes.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {MODE_LABELS[mode]}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>Pre-selected when a visitor opens the page.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Headline stats</CardTitle>
          <CardDescription>Rating, students and duration shown under the title.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <NumberField
            name="rating"
            label="Rating"
            step="0.1"
            min={0}
            max={5}
            placeholder="4.9"
            nullable
          />
          <NumberField name="students_count" label="Students" min={0} placeholder="18420" />
          <NumberField
            name="total_hours"
            label="Total hours"
            step="0.5"
            min={0}
            placeholder="60"
            nullable
          />
        </CardContent>
      </Card>
    </div>
  );
}
