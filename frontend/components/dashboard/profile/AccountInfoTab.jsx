'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Mail, Save, User } from 'lucide-react';
import GlassAuthInput from '@/components/auth/GlassAuthInput';
import GlassPhoneInput from '@/components/auth/GlassPhoneInput';
import GlassPanel from '@/components/dashboard/GlassPanel';
import AvatarUploader from './AvatarUploader';
import {
  ACCOUNT_FIELD_MAP,
  createAccountInfoSchema,
  remapServerErrors,
} from '@/lib/validations/profile';
import { applyServerErrors } from '@/lib/auth';
import { toastApiError } from '@/lib/toast';

/** Tab 1 — personal account info: avatar, names, email, phone. */
export default function AccountInfoTab({ profile, labels, lang, onSave, onSaveAvatar }) {
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(createAccountInfoSchema(lang)),
    mode: 'onBlur',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
    },
  });

  // Hydrate the form once the profile arrives (and after a successful save).
  useEffect(() => {
    if (!profile) return;

    reset({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      email: profile.email || '',
      phoneNumber: profile.phoneNumber || '',
    });
  }, [profile, reset]);

  const onSubmit = async (values) => {
    try {
      const { source } = await onSave(values);
      reset(values);
      toast.success(source === 'mock' ? labels.savedLocally : labels.profileSaved);
    } catch (error) {
      const fieldMessage = applyServerErrors(
        setError,
        remapServerErrors(error?.data, ACCOUNT_FIELD_MAP)
      );
      if (!fieldMessage) toastApiError(error, labels.genericError);
    }
  };

  const handleAvatar = async (file) => {
    setIsUploading(true);
    try {
      const { source } = await onSaveAvatar(file);
      toast.success(source === 'mock' ? labels.avatarSavedLocally : labels.avatarSaved);
    } catch (error) {
      toastApiError(error, labels.genericError);
    } finally {
      setIsUploading(false);
    }
  };

  const initial = (profile?.firstName || profile?.email || 'U').charAt(0).toUpperCase();

  return (
    <GlassPanel>
      <h2 className="text-lg font-bold text-white">{labels.accountTab}</h2>
      <p className="mt-1 text-sm text-gray-400">{labels.accountTabHint}</p>

      <div className="mt-6">
        <AvatarUploader
          avatarUrl={profile?.avatarUrl}
          initial={initial}
          labels={labels}
          isUploading={isUploading}
          onUpload={handleAvatar}
          onValidationError={(message) => toast.error(message)}
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <GlassAuthInput
            id="profile-first-name"
            label={labels.firstName}
            icon={User}
            autoComplete="given-name"
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <GlassAuthInput
            id="profile-last-name"
            label={labels.lastName}
            icon={User}
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>

        <GlassAuthInput
          id="profile-email"
          type="email"
          label={labels.email}
          icon={Mail}
          dir="ltr"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Controller
          control={control}
          name="phoneNumber"
          render={({ field }) => (
            <GlassPhoneInput
              id="profile-phone"
              label={labels.phone}
              lang={lang}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.phoneNumber?.message}
            />
          )}
        />

        {errors.root?.message ? (
          <p className="text-sm text-red-300" role="alert">
            {errors.root.message}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-plum-700 to-plum-500 px-6 text-sm font-semibold text-white transition-all duration-300 hover:from-plum-600 hover:to-plum-400 hover:shadow-lg hover:shadow-plum-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#181124] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {labels.saving}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden />
                {labels.saveChanges}
              </>
            )}
          </button>

          {isDirty ? (
            <button
              type="button"
              onClick={() =>
                reset({
                  firstName: profile?.firstName || '',
                  lastName: profile?.lastName || '',
                  email: profile?.email || '',
                  phoneNumber: profile?.phoneNumber || '',
                })
              }
              className="inline-flex min-h-[48px] items-center rounded-xl border border-white/15 px-5 text-sm font-medium text-gray-300 transition-all duration-300 hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
            >
              {labels.discard}
            </button>
          ) : null}
        </div>
      </form>
    </GlassPanel>
  );
}
