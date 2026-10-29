'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import { ImageUploader } from '@/components/admin/ImageUploader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CourseFormValues } from '@/lib/admin/schema';
import { BilingualBulletList, BilingualField, BulletList, TextField } from './fields';

function SeoCharCount({ value, soft, hard }: { value: string; soft: number; hard: number }) {
  const len = value?.length ?? 0;
  const overSoft = len > soft;
  const overHard = len > hard;
  return (
    <p
      className={`mt-1 text-xs ${
        overHard ? 'text-red-600 dark:text-red-400' : overSoft ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500'
      }`}
    >
      {len}/{hard} (recommended ≤ {soft})
    </p>
  );
}

function GooglePreview({
  title,
  description,
  slug,
}: {
  title: string;
  description: string;
  slug: string;
}) {
  const displayTitle = title.trim() || 'Course title preview';
  const displayDesc = description.trim() || 'Meta description preview will appear here.';
  const url = `https://www.creativity-house.com/en/courses/${slug || 'course-slug'}`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#0d0514]/60">
      <p className="truncate text-sm text-[#202124] dark:text-gray-300">{url}</p>
      <p className="mt-1 truncate text-xl leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">{displayTitle}</p>
      <p className="mt-1 line-clamp-2 text-sm leading-snug text-[#4d5156] dark:text-gray-400">{displayDesc}</p>
    </div>
  );
}

export function MarketingTab() {
  const { control, setValue } = useFormContext<CourseFormValues>();
  const coverImage = useWatch({ control, name: 'cover_image' });
  const slug = useWatch({ control, name: 'slug' }) || '';
  const seoTitleEn = useWatch({ control, name: 'seo_title_en' }) || '';
  const seoDescEn = useWatch({ control, name: 'seo_description_en' }) || '';
  const seoTitleAr = useWatch({ control, name: 'seo_title_ar' }) || '';
  const seoDescAr = useWatch({ control, name: 'seo_description_ar' }) || '';

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
          <CardDescription>
            Overrides the default title and meta description per language. Recommended title ≤ 60
            chars, description ≤ 160 chars.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <TextField name="seo_title_en" label="SEO title (EN)" maxLength={70} showCounter={false} />
              <SeoCharCount value={seoTitleEn} soft={60} hard={70} />
            </div>
            <div>
              <TextField name="seo_title_ar" label="SEO title (AR)" dir="rtl" maxLength={70} showCounter={false} />
              <SeoCharCount value={seoTitleAr} soft={60} hard={70} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <TextField
                name="seo_description_en"
                label="SEO description (EN)"
                multiline
                rows={3}
                maxLength={170}
                showCounter={false}
              />
              <SeoCharCount value={seoDescEn} soft={160} hard={170} />
            </div>
            <div>
              <TextField
                name="seo_description_ar"
                label="SEO description (AR)"
                multiline
                rows={3}
                dir="rtl"
                maxLength={170}
                showCounter={false}
              />
              <SeoCharCount value={seoDescAr} soft={160} hard={170} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              Google-style preview (EN)
            </p>
            <GooglePreview title={seoTitleEn} description={seoDescEn} slug={slug} />
          </div>

          <TextField
            name="seo_title"
            label="Legacy SEO title (fallback)"
            description="Used only if language-specific titles are empty."
          />
          <TextField
            name="seo_description"
            label="Legacy SEO description (fallback)"
            multiline
            rows={2}
          />
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
