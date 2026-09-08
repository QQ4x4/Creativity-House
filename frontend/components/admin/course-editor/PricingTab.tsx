'use client';

import { useFormContext, useWatch } from 'react-hook-form';

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
import { emptyPricingTier, type CourseFormValues } from '@/lib/admin/schema';
import { BilingualBulletList, NumberField, TextField } from './fields';

const MODE_LABELS: Record<DeliveryMode, string> = {
  live: 'Live',
  recorded: 'Recorded',
  simulator: 'Simulator',
};

function ModeTierCard({ mode, index }: { mode: DeliveryMode; index: number }) {
  const prefix = `pricing_tiers.${index}` as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{MODE_LABELS[mode]} pricing</CardTitle>
        <CardDescription>
          Price, duration, badge, guarantee and feature checklist for the {MODE_LABELS[mode]} tab.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <NumberField
            name={`${prefix}.price`}
            label="Price"
            step="0.01"
            min={0}
            placeholder="599"
          />
          <NumberField
            name={`${prefix}.original_price`}
            label="Original price"
            step="0.01"
            min={0}
            placeholder="799"
            nullable
            description="Leave empty for no discount."
          />
          <NumberField
            name={`${prefix}.duration_hours`}
            label="Duration (hours)"
            step="1"
            min={0}
            placeholder="60"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            name={`${prefix}.badge_text_en`}
            label="Badge (EN)"
            placeholder="Best value"
          />
          <TextField
            name={`${prefix}.badge_text_ar`}
            label="Badge (AR)"
            placeholder="أفضل قيمة"
            dir="rtl"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            name={`${prefix}.guarantee_title_en`}
            label="Guarantee title (EN)"
            placeholder="30-Day Money-Back Guarantee"
          />
          <TextField
            name={`${prefix}.guarantee_title_ar`}
            label="Guarantee title (AR)"
            placeholder="ضمان استرداد الأموال خلال 30 يومًا"
            dir="rtl"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            name={`${prefix}.guarantee_text_en`}
            label="Guarantee text (EN)"
            multiline
            rows={3}
            placeholder="Full refund if you are not satisfied."
          />
          <TextField
            name={`${prefix}.guarantee_text_ar`}
            label="Guarantee text (AR)"
            multiline
            rows={3}
            dir="rtl"
            placeholder="استرداد كامل إذا لم تكن راضيًا."
          />
        </div>

        <BilingualBulletList
          nameEn={`${prefix}.features_en`}
          nameAr={`${prefix}.features_ar`}
          label="Included features"
          description="Shown as the checklist under the buy button."
        />
      </CardContent>
    </Card>
  );
}

export function PricingTab() {
  const { control, setValue, getValues } = useFormContext<CourseFormValues>();

  const availableModes = useWatch({ control, name: 'available_modes' }) ?? [];
  const pricingTiers = useWatch({ control, name: 'pricing_tiers' }) ?? [];
  const defaultMode = useWatch({ control, name: 'default_mode' });

  const syncCourseLevelFromDefault = (tiers: CourseFormValues['pricing_tiers'], mode: DeliveryMode | null) => {
    const tier = tiers.find((item) => item.mode === mode) ?? tiers[0];
    if (!tier) return;
    setValue('price', tier.price, { shouldDirty: true });
    setValue('original_price', tier.original_price, { shouldDirty: true });
    setValue('total_hours', tier.duration_hours > 0 ? tier.duration_hours : null, {
      shouldDirty: true,
    });
  };

  const toggleMode = (mode: DeliveryMode, enabled: boolean) => {
    const currentModes = getValues('available_modes') ?? [];
    const currentTiers = getValues('pricing_tiers') ?? [];
    const set = new Set(currentModes);

    if (enabled) {
      set.add(mode);
    } else {
      set.delete(mode);
    }

    const nextModes = DELIVERY_MODES.filter((item) => set.has(item));
    let nextTiers = currentTiers.filter((tier) => set.has(tier.mode));

    if (enabled && !nextTiers.some((tier) => tier.mode === mode)) {
      nextTiers = [...nextTiers, emptyPricingTier(mode, { sort_order: nextTiers.length })];
      // Keep canonical mode order so cards match the checkbox row.
      nextTiers = DELIVERY_MODES.filter((item) => set.has(item))
        .map((item) => nextTiers.find((tier) => tier.mode === item)!)
        .filter(Boolean);
    }

    setValue('available_modes', nextModes, { shouldDirty: true, shouldValidate: true });
    setValue('pricing_tiers', nextTiers, { shouldDirty: true, shouldValidate: true });

    const currentDefault = getValues('default_mode');
    if (currentDefault && !nextModes.includes(currentDefault)) {
      const nextDefault = nextModes[0] ?? null;
      setValue('default_mode', nextDefault, { shouldDirty: true, shouldValidate: true });
      syncCourseLevelFromDefault(nextTiers, nextDefault);
    } else if (enabled && mode === currentDefault) {
      syncCourseLevelFromDefault(nextTiers, currentDefault);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Currency & delivery modes</CardTitle>
          <CardDescription>
            Enable the modes that appear as toggle buttons on the public course page. Each enabled
            mode gets its own pricing card below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <TextField name="currency" label="Currency" placeholder="USD" />

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
                            toggleMode(mode, next === true);
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
                  onValueChange={(value) => {
                    const next = value === '' ? null : (value as DeliveryMode);
                    field.onChange(next);
                    syncCourseLevelFromDefault(getValues('pricing_tiers') ?? [], next);
                  }}
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

      {availableModes.map((mode) => {
        const index = pricingTiers.findIndex((tier) => tier.mode === mode);
        if (index < 0) return null;
        return <ModeTierCard key={mode} mode={mode} index={index} />;
      })}

      <Card>
        <CardHeader>
          <CardTitle>Headline stats</CardTitle>
          <CardDescription>
            Rating and students shown under the title. Total hours syncs from the default mode tier
            on save{defaultMode ? ` (${MODE_LABELS[defaultMode]})` : ''}.
          </CardDescription>
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
            description="Mirrored from the default mode duration when you save."
          />
        </CardContent>
      </Card>
    </div>
  );
}
