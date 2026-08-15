'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Bell, Loader2, Lock, Save, ShieldCheck } from 'lucide-react';
import GlassAuthInput from '@/components/auth/GlassAuthInput';
import PasswordRequirements from '@/components/auth/PasswordRequirements';
import GlassPanel from '@/components/dashboard/GlassPanel';
import ToggleSwitch from '@/components/dashboard/ToggleSwitch';
import {
  PASSWORD_FIELD_MAP,
  createPasswordChangeSchema,
  remapServerErrors,
} from '@/lib/validations/profile';
import { applyServerErrors } from '@/lib/auth';
import { toastApiError } from '@/lib/toast';

/** Tab 2 — password change (with live strength) + notification preferences. */
export default function SecurityTab({
  profile,
  labels,
  authLabels,
  lang,
  onSavePassword,
  onSaveNotifications,
}) {
  const [mounted, setMounted] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [preferences, setPreferences] = useState({
    courseUpdates: true,
    newCertificates: true,
    promotions: false,
  });
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createPasswordChangeSchema(lang)),
    mode: 'onBlur',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (profile?.notificationPreferences) {
      setPreferences(profile.notificationPreferences);
    }
  }, [profile]);

  const newPasswordValue = watch('newPassword') || '';
  const newPasswordField = register('newPassword');
  const showRequirements = passwordFocused || newPasswordValue.length > 0;

  const onSubmit = async (values) => {
    try {
      const { source } = await onSavePassword(values);
      reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordFocused(false);
      toast.success(source === 'mock' ? labels.savedLocally : labels.passwordUpdated);
    } catch (error) {
      const fieldMessage = applyServerErrors(
        setError,
        remapServerErrors(error?.data, PASSWORD_FIELD_MAP)
      );
      if (!fieldMessage) toastApiError(error, labels.genericError);
    }
  };

  /** Toggles save immediately — optimistic, reverted if the request fails. */
  const handleToggle = async (key, value) => {
    const previous = preferences;
    const next = { ...preferences, [key]: value };

    setPreferences(next);
    setIsSavingPreferences(true);

    try {
      const { source } = await onSaveNotifications(next);
      toast.success(source === 'mock' ? labels.savedLocally : labels.preferencesSaved);
    } catch (error) {
      setPreferences(previous);
      toastApiError(error, labels.genericError);
    } finally {
      setIsSavingPreferences(false);
    }
  };

  return (
    <div className="space-y-6">
      <GlassPanel>
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 shadow-[0_0_18px_rgba(168,85,247,0.25)]"
            aria-hidden
          >
            <ShieldCheck className="h-5 w-5 text-purple-300" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-white">{labels.passwordSection}</h2>
            <p className="mt-1 text-sm text-gray-400">{labels.passwordSectionHint}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
          <GlassAuthInput
            id="current-password"
            label={labels.currentPassword}
            icon={Lock}
            showPasswordToggle
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />

          <div>
            <GlassAuthInput
              id="new-password"
              label={labels.newPassword}
              icon={Lock}
              showPasswordToggle
              autoComplete="new-password"
              aria-describedby="profile-password-requirements"
              error={errors.newPassword?.message}
              {...newPasswordField}
              onFocus={() => setPasswordFocused(true)}
              onBlur={(event) => {
                newPasswordField.onBlur(event);
                setPasswordFocused(false);
              }}
            />

            {mounted ? (
              <PasswordRequirements
                id="profile-password-requirements"
                password={newPasswordValue}
                visible={showRequirements}
                labels={{
                  title: authLabels.passwordRequirementsTitle,
                  strength: authLabels.passwordStrength,
                  weak: authLabels.passwordWeak,
                  fair: authLabels.passwordFair,
                  strong: authLabels.passwordStrong,
                  veryStrong: authLabels.passwordVeryStrong,
                  length: authLabels.passwordRuleLength,
                  uppercase: authLabels.passwordRuleUppercase,
                  lowercase: authLabels.passwordRuleLowercase,
                  number: authLabels.passwordRuleNumber,
                  special: authLabels.passwordRuleSpecial,
                }}
              />
            ) : null}
          </div>

          <GlassAuthInput
            id="confirm-new-password"
            label={labels.confirmNewPassword}
            icon={Lock}
            showPasswordToggle
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <button
            type="submit"
            disabled={isSubmitting}
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
                {labels.updatePassword}
              </>
            )}
          </button>
        </form>
      </GlassPanel>

      <GlassPanel>
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-400/15 shadow-[0_0_18px_rgba(212,175,55,0.25)]"
            aria-hidden
          >
            <Bell className="h-5 w-5 text-gold-300" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-white">{labels.notificationsSection}</h2>
            <p className="mt-1 text-sm text-gray-400">{labels.notificationsSectionHint}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <ToggleSwitch
            id="notify-course-updates"
            checked={preferences.courseUpdates}
            disabled={isSavingPreferences}
            onChange={(value) => handleToggle('courseUpdates', value)}
            label={labels.notifyCourseUpdates}
            description={labels.notifyCourseUpdatesHint}
          />
          <ToggleSwitch
            id="notify-certificates"
            checked={preferences.newCertificates}
            disabled={isSavingPreferences}
            onChange={(value) => handleToggle('newCertificates', value)}
            label={labels.notifyCertificates}
            description={labels.notifyCertificatesHint}
          />
          <ToggleSwitch
            id="notify-promotions"
            checked={preferences.promotions}
            disabled={isSavingPreferences}
            onChange={(value) => handleToggle('promotions', value)}
            label={labels.notifyPromotions}
            description={labels.notifyPromotionsHint}
          />
        </div>
      </GlassPanel>
    </div>
  );
}
