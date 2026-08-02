'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, Lock } from 'lucide-react';
import GlassAuthInput from '@/components/auth/GlassAuthInput';
import OtpInput from '@/components/auth/OtpInput';
import { applyServerErrors } from '@/lib/auth';
import { ApiError, apiPost, getCsrfCookie } from '@/lib/api';
import {
  createForgotPasswordSchema,
  createResetPasswordSchema,
} from '@/lib/validations/auth';
import { toastApiError } from '@/lib/toast';
import { toast } from 'sonner';

export default function ForgotPasswordForm({ dictionary, lang }) {
  const router = useRouter();
  const t = dictionary.auth;
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const requestForm = useForm({
    resolver: zodResolver(createForgotPasswordSchema(lang)),
    defaultValues: { email: '' },
  });

  const resetForm = useForm({
    resolver: zodResolver(createResetPasswordSchema(lang)),
    defaultValues: {
      code: '',
      password: '',
      password_confirmation: '',
    },
  });

  const onRequestReset = async (values) => {
    setFormError('');
    setSuccessMessage('');

    try {
      await getCsrfCookie();
      const normalizedEmail = values.email.trim().toLowerCase().slice(0, 50);
      await apiPost('/auth/forgot-password', { email: normalizedEmail });
      setEmail(normalizedEmail);
      setStep(2);
      setSuccessMessage(t.resetCodeSent);
      toast.success(t.resetCodeSent);
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldMessage = applyServerErrors(requestForm.setError, error.data);
        toastApiError(error, t.genericError);
        if (!fieldMessage) {
          setFormError(error.data?.message || error.message || t.genericError);
        }
        return;
      }
      toast.error(t.genericError);
      setFormError(t.genericError);
    }
  };

  const onResetPassword = async (values) => {
    setFormError('');
    setSuccessMessage('');

    const code = (values.code || otpCode).trim();
    if (!/^\d{6}$/.test(code)) {
      resetForm.setError('code', { type: 'manual', message: t.otpInvalid });
      return;
    }

    try {
      await getCsrfCookie();
      await apiPost('/auth/reset-password', {
        email,
        code,
        password: values.password.slice(0, 50),
        password_confirmation: values.password_confirmation.slice(0, 50),
      });
      setSuccessMessage(t.resetSuccess);
      toast.success(t.resetSuccess);
      setTimeout(() => {
        router.push(`/${lang}/login`);
      }, 900);
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldMessage = applyServerErrors(resetForm.setError, error.data);
        toastApiError(error, t.genericError);
        if (!fieldMessage) {
          setFormError(error.data?.message || error.message || t.genericError);
        }
        return;
      }
      toast.error(t.genericError);
      setFormError(t.genericError);
    }
  };

  return (
    <div className="relative min-h-[280px]">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.form
            key="request"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={requestForm.handleSubmit(onRequestReset)}
            className="space-y-5"
            noValidate
          >
            <GlassAuthInput
              id="email"
              type="email"
              label={t.email}
              icon={Mail}
              maxLength={50}
              autoComplete="email"
              dir="ltr"
              error={requestForm.formState.errors.email?.message}
              {...requestForm.register('email')}
            />

            {formError ? (
              <p className="text-start text-sm text-red-300" role="alert">
                {formError}
              </p>
            ) : null}

            <motion.button
              type="submit"
              disabled={requestForm.formState.isSubmitting}
              whileHover={{ scale: requestForm.formState.isSubmitting ? 1 : 1.01 }}
              whileTap={{ scale: requestForm.formState.isSubmitting ? 1 : 0.98 }}
              className="flex min-h-[48px] w-full max-w-full items-center justify-center rounded-2xl bg-gradient-to-r from-plum-700 via-plum-600 to-gold-600 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_-10px_rgba(107,55,98,0.7)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
            >
              {requestForm.formState.isSubmitting ? t.submitting : t.sendResetCode}
            </motion.button>

            <p className="text-center text-sm text-gray-400">
              <Link
                href={`/${lang}/login`}
                className="font-semibold text-gold-300 transition-colors hover:text-gold-200"
              >
                {t.backToLogin}
              </Link>
            </p>
          </motion.form>
        ) : (
          <motion.form
            key="reset"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={resetForm.handleSubmit(onResetPassword)}
            className="space-y-5"
            noValidate
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-start text-sm text-gray-300">
              {t.resetCodeSentTo}{' '}
              <span className="font-semibold text-white" dir="ltr">
                {email}
              </span>
            </div>

            <div className="text-start">
              <p className="mb-1.5 ms-1 text-sm font-medium text-gray-300">{t.verifyCode}</p>
              <OtpInput
                value={otpCode}
                onChange={(next) => {
                  setOtpCode(next);
                  resetForm.setValue('code', next, { shouldValidate: next.length === 6 });
                }}
                disabled={resetForm.formState.isSubmitting}
                error={resetForm.formState.errors.code?.message}
              />
            </div>

            <GlassAuthInput
              id="password"
              label={t.newPassword}
              icon={Lock}
              showPasswordToggle
              maxLength={50}
              autoComplete="new-password"
              error={resetForm.formState.errors.password?.message}
              {...resetForm.register('password')}
            />

            <GlassAuthInput
              id="password_confirmation"
              label={t.confirmNewPassword}
              icon={Lock}
              showPasswordToggle
              maxLength={50}
              autoComplete="new-password"
              error={resetForm.formState.errors.password_confirmation?.message}
              {...resetForm.register('password_confirmation')}
            />

            {formError ? (
              <p className="text-start text-sm text-red-300" role="alert">
                {formError}
              </p>
            ) : null}

            {successMessage ? (
              <p className="text-start text-sm font-medium text-emerald-300" role="status">
                {successMessage}
              </p>
            ) : null}

            <motion.button
              type="submit"
              disabled={resetForm.formState.isSubmitting}
              whileHover={{ scale: resetForm.formState.isSubmitting ? 1 : 1.01 }}
              whileTap={{ scale: resetForm.formState.isSubmitting ? 1 : 0.98 }}
              className="flex min-h-[48px] w-full max-w-full items-center justify-center rounded-2xl bg-gradient-to-r from-plum-700 via-plum-600 to-gold-600 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_-10px_rgba(107,55,98,0.7)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
            >
              {resetForm.formState.isSubmitting ? t.submitting : t.resetPassword}
            </motion.button>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setOtpCode('');
                setFormError('');
                setSuccessMessage('');
              }}
              className="w-full text-center text-sm text-gray-400 hover:text-white"
            >
              {t.useDifferentEmail}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
