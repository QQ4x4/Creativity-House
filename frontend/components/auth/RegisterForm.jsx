'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { User, Mail, Lock } from 'lucide-react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import GlassAuthInput from '@/components/auth/GlassAuthInput';
import GlassPhoneInput from '@/components/auth/GlassPhoneInput';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import PasswordRequirements from '@/components/auth/PasswordRequirements';
import {
  applyServerErrors,
  formatValidationErrors,
  obtainRecaptchaToken,
  sanitizeRegisterPayload,
} from '@/lib/auth';
import { ApiError, apiPost, getCsrfCookie } from '@/lib/api';
import { createRegisterSchema } from '@/lib/validations/auth';
import { toastApiError } from '@/lib/toast';
import { toast } from 'sonner';

export default function RegisterForm({ dictionary, lang }) {
  const router = useRouter();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [formError, setFormError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const t = dictionary.auth;

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    control,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createRegisterSchema(lang)),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      password: '',
      password_confirmation: '',
    },
  });

  const passwordValue = watch('password') || '';
  const passwordField = register('password');
  const showPasswordRequirements =
    passwordFocused || String(passwordValue).length > 0;

  const onSubmit = async (values) => {
    setFormError('');

    try {
      const recaptchaToken = await obtainRecaptchaToken(executeRecaptcha, 'register');

      await getCsrfCookie();
      const payload = sanitizeRegisterPayload(values, recaptchaToken);
      const data = await apiPost('/auth/register', payload);

      if (data?.email_sent === false) {
        toast.warning(data.message || t.registerMailWarning);
      } else {
        toast.success(t.registerSuccess);
      }

      if (data?.requires_verification) {
        router.push(`/${lang}/verify-otp?email=${encodeURIComponent(data.email)}`);
        return;
      }

      router.push(`/${lang}`);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        const payload =
          typeof error?.toJSON === 'function'
            ? error.toJSON()
            : {
                name: error?.name,
                message: error?.message,
                status: error?.status,
                data: error?.data,
              };
        console.error('[register] failed', payload);
      }

      const isApiError = error instanceof ApiError || error?.name === 'ApiError';

      if (isApiError) {
        const fieldMessage = applyServerErrors(setError, error.data);
        const detailed =
          formatValidationErrors(error.data) ||
          fieldMessage ||
          error.data?.message ||
          error.message;

        toastApiError(error, t.genericError);

        setFormError(
          error.status === 422
            ? detailed || 'Validation failed. Check the highlighted fields.'
            : detailed || t.genericError
        );
        return;
      }

      const message = error?.message || t.genericError;
      toast.error(message);
      setFormError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <GlassAuthInput
          id="first_name"
          label={t.firstName}
          icon={User}
          maxLength={50}
          autoComplete="given-name"
          error={errors.first_name?.message}
          {...register('first_name')}
        />
        <GlassAuthInput
          id="last_name"
          label={t.lastName}
          icon={User}
          maxLength={50}
          autoComplete="family-name"
          error={errors.last_name?.message}
          {...register('last_name')}
        />
      </div>

      <GlassAuthInput
        id="email"
        type="email"
        label={t.email}
        icon={Mail}
        maxLength={50}
        autoComplete="email"
        dir="ltr"
        error={errors.email?.message}
        {...register('email')}
      />

      <Controller
        name="phone_number"
        control={control}
        render={({ field }) => (
          <GlassPhoneInput
            id="phone_number"
            label={t.phone}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            name={field.name}
            error={errors.phone_number?.message}
            defaultCountry="YE"
            lang={lang}
          />
        )}
      />

      <div>
        <GlassAuthInput
          id="password"
          label={t.password}
          icon={Lock}
          showPasswordToggle
          maxLength={50}
          autoComplete="new-password"
          error={errors.password?.message}
          aria-describedby="password-requirements"
          {...passwordField}
          onFocus={(event) => {
            passwordField.onFocus?.(event);
            setPasswordFocused(true);
          }}
          onBlur={(event) => {
            passwordField.onBlur(event);
            setPasswordFocused(false);
          }}
        />

        {mounted ? (
          <PasswordRequirements
            id="password-requirements"
            password={passwordValue}
            visible={showPasswordRequirements}
            labels={{
              title: t.passwordRequirementsTitle,
              strength: t.passwordStrength,
              weak: t.passwordWeak,
              fair: t.passwordFair,
              strong: t.passwordStrong,
              veryStrong: t.passwordVeryStrong,
              length: t.passwordRuleLength,
              uppercase: t.passwordRuleUppercase,
              lowercase: t.passwordRuleLowercase,
              number: t.passwordRuleNumber,
              special: t.passwordRuleSpecial,
            }}
          />
        ) : null}
      </div>

      <GlassAuthInput
        id="password_confirmation"
        label={t.confirmPassword}
        icon={Lock}
        showPasswordToggle
        maxLength={50}
        autoComplete="new-password"
        error={errors.password_confirmation?.message}
        {...register('password_confirmation')}
      />

      {formError ? (
        <p className="text-sm text-red-300" role="alert">
          {formError}
        </p>
      ) : null}

      <motion.button
        type="submit"
        disabled={isSubmitting}
        whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
        whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
        transition={{ duration: 0.2 }}
        className="flex min-h-[48px] w-full max-w-full items-center justify-center rounded-2xl bg-gradient-to-r from-plum-700 via-plum-600 to-gold-600 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_-10px_rgba(107,55,98,0.7)] transition-opacity duration-200 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
      >
        {isSubmitting ? t.submitting : t.createAccount}
      </motion.button>

      <div className="relative py-2 text-center text-xs uppercase tracking-wider text-gray-500">
        <span className="relative z-10 bg-transparent px-3">{t.or}</span>
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />
      </div>

      <GoogleAuthButton label={t.googleSignUp} />

      <p className="text-center text-sm text-gray-400">
        {t.haveAccount}{' '}
        <Link href={`/${lang}/login`} className="font-semibold text-gold-300 hover:text-gold-200">
          {t.loginLink}
        </Link>
      </p>
    </form>
  );
}
