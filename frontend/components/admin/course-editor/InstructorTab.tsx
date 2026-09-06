'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import { ImageUploader } from '@/components/admin/ImageUploader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CourseFormValues } from '@/lib/admin/schema';
import { BilingualBulletList, BilingualField, NumberField, TextField } from './fields';

export function InstructorTab() {
  const { control, setValue } = useFormContext<CourseFormValues>();
  const photo = useWatch({ control, name: 'instructor_photo' });
  const name = useWatch({ control, name: 'instructor_name' });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Instructor</CardTitle>
          <CardDescription>
            Rendered in the &ldquo;Your instructor&rdquo; section at the bottom of the course page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BilingualField
            nameEn="instructor_name"
            nameAr="instructor_name_ar"
            label="Name"
            placeholderEn="Dr. Talaat El-Awady"
            placeholderAr="د. طلعت العوضي"
          />

          <BilingualField
            nameEn="instructor_title_en"
            nameAr="instructor_title_ar"
            label="Title"
            placeholderEn="ATP Certified PMP Trainer"
            placeholderAr="مدرب PMP معتمد من ATP"
          />

          <BilingualField
            nameEn="instructor_bio_en"
            nameAr="instructor_bio_ar"
            label="Biography"
            multiline
            rows={6}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photo</CardTitle>
          <CardDescription>
            Square image, shown as a 112px circle. Upload a file or paste a URL / public path.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-white/5">
              {photo ? (
                // Arbitrary host or /public path, so next/image is skipped here.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt={name || 'Instructor'}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.visibility = 'hidden';
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                  No photo
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              <ImageUploader
                label="Upload instructor photo"
                variant="avatar"
                value={photo}
                onUploaded={(url) =>
                  setValue('instructor_photo', url, { shouldDirty: true, shouldValidate: true })
                }
              />

              <TextField
                name="instructor_photo"
                label="Photo URL"
                type="url"
                placeholder="/images/DR.jpg"
                description="Upload above, or paste a URL / path under /public."
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              name="instructor_trained"
              label="Professionals trained"
              placeholder="2,000+"
              description="Free text — rendered verbatim."
            />
            <NumberField
              name="instructor_countries"
              label="Countries"
              min={0}
              max={500}
              placeholder="16"
              nullable
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credentials</CardTitle>
          <CardDescription>Bullet list next to the award icons.</CardDescription>
        </CardHeader>
        <CardContent>
          <BilingualBulletList
            nameEn="instructor_credentials.en"
            nameAr="instructor_credentials.ar"
            label="Credentials"
            addLabel="Add credential"
          />
        </CardContent>
      </Card>
    </div>
  );
}
