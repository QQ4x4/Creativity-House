'use client';

import { useFormContext } from 'react-hook-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { COURSE_CATEGORIES } from '@/lib/admin/types';
import type { CourseFormValues } from '@/lib/admin/schema';
import { BilingualField, TextField, ToggleField } from './fields';

const CATEGORY_LABELS: Record<string, string> = {
  live: 'Live training',
  recorded: 'Recorded',
  simulators: 'Exam simulators',
  materials: 'Study materials',
};

export function GeneralTab() {
  const { control } = useFormContext<CourseFormValues>();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General details</CardTitle>
          <CardDescription>
            Headline copy shown at the top of the public course page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BilingualField
            nameEn="title_en"
            nameAr="title_ar"
            label="Title"
            placeholderEn="PMP® Live Training Full Program"
            placeholderAr="البرنامج الكامل لتدريب PMP® المباشر"
          />

          <BilingualField
            nameEn="subtitle_en"
            nameAr="subtitle_ar"
            label="Subtitle"
            description="One line under the title."
            multiline
            rows={2}
          />

          <BilingualField
            nameEn="badge"
            nameAr="badge_ar"
            label="Badge"
            description="Small pill above the title."
            placeholderEn="Live & Interactive"
            placeholderAr="مباشر وتفاعلي"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              name="slug"
              label="Slug"
              description="URL segment: /courses/your-slug"
              placeholder="pmp-live-training"
            />

            <FormField
              control={control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(value) => field.onChange(value === '' ? null : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COURSE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {CATEGORY_LABELS[category] ?? category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Drives the catalog filter chips.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <BilingualField
            nameEn="language_en"
            nameAr="language_ar"
            label="Language"
            description="Rendered next to the globe icon."
            placeholderEn="English & Arabic"
            placeholderAr="الإنجليزية والعربية"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <TextField name="level" label="Level" placeholder="Professional" />
            <TextField
              name="last_updated_at"
              label="Last updated"
              type="date"
              description='Shown as "Last updated" in the header.'
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visibility</CardTitle>
          <CardDescription>
            A course must be published before it can be listed publicly.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <ToggleField
            name="is_published"
            label="Published"
            description="Unpublished courses are hidden everywhere."
          >
            {(props) => <Switch {...props} aria-label="Published" />}
          </ToggleField>

          <ToggleField
            name="is_public"
            label="Listed in public catalog"
            description="Appears on /courses and is buyable."
          >
            {(props) => <Switch {...props} aria-label="Listed in public catalog" />}
          </ToggleField>
        </CardContent>
      </Card>
    </div>
  );
}
