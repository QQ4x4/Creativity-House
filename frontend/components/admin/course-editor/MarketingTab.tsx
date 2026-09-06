'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import { ImageUploader } from '@/components/admin/ImageUploader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CourseFormValues } from '@/lib/admin/schema';
import { BilingualBulletList, BilingualField, BulletList, TextField } from './fields';

export function MarketingTab() {
  const { control, setValue } = useFormContext<CourseFormValues>();
  const coverImage = useWatch({ control, name: 'cover_image' });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Description &amp; schedule</CardTitle>
          <CardDescription>
            Long-form copy for the &ldquo;About&rdquo; and &ldquo;Schedule&rdquo; sections.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BilingualField
            nameEn="description_en"
            nameAr="description_ar"
            label="Description"
            multiline
            rows={8}
          />
          <BilingualField
            nameEn="schedule_en"
            nameAr="schedule_ar"
            label="Schedule"
            multiline
            rows={5}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audience &amp; outcomes</CardTitle>
          <CardDescription>
            Bullet lists rendered in the &ldquo;Who is this for&rdquo; and &ldquo;What you will
            learn&rdquo; sections.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <BilingualBulletList
            nameEn="target_audience.en"
            nameAr="target_audience.ar"
            label="Target audience"
            addLabel="Add audience"
          />

          <BilingualBulletList
            nameEn="learning_outcomes.en"
            nameAr="learning_outcomes.ar"
            label="Learning outcomes"
            addLabel="Add outcome"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Media</CardTitle>
          <CardDescription>Cover image used on catalog cards and social previews.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageUploader
            label="Upload cover image"
            variant="cover"
            value={coverImage}
            onUploaded={(url) =>
              setValue('cover_image', url, { shouldDirty: true, shouldValidate: true })
            }
          />

          <TextField
            name="cover_image"
            label="Cover image URL"
            type="url"
            placeholder="https://images.unsplash.com/…"
            description="Upload above, or paste an absolute URL / public disk path."
          />

          {coverImage ? (
            <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10">
              {/* Arbitrary external host, so next/image optimization is skipped. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImage}
                alt="Cover preview"
                className="h-48 w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <TextField name="duration_label_en" label="Duration label (EN)" placeholder="60 Hours" />
            <TextField
              name="duration_label_ar"
              label="Duration label (AR)"
              placeholder="60 ساعة"
              dir="rtl"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
          <CardDescription>Overrides the default title and meta description.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <TextField name="seo_title" label="SEO title" />
          <TextField name="seo_description" label="SEO description" multiline rows={3} />
          <BulletList
            name="seo_keywords"
            label="SEO keywords"
            addLabel="Add keyword"
            placeholder="pmp certification"
            emptyHint="No keywords yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
