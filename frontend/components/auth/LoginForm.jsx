'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Mail, Lock } from 'lucide-react';
import GlassAuthInput from '@/components/auth/GlassAuthInput';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import { applyServerErrors } from '@/lib/auth';
import { ApiError, apiPost, getCsrfCookie } from '@/lib/api';
import { createLoginSchema } from '@/lib/validations/auth';
import { useAuth } from '@/providers/AuthProvider';
import { toastApiError } from '@/lib/toast';
import { toast } from 'sonner';

export default function LoginForm({ dictionary, lang }) {
  const router = useRouter();
  const { setUser, refreshUser } = useAuth();
  const [formError, setFormError] = useState('');
  const t = dictionary.auth;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createLoginSchema(lang)),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values) => {
    setFormError('');

    try {
      await getCsrfCookie();
      const data = await apiPost('/auth/login', {
        email: values.email.trim().toLowerCase().slice(0, 50),
        password: values.password.slice(0, 50),
      });

      if (data?.user) {
        setUser(data.user);
      } else {
        await refreshUser();
      }

      toast.success(t.loginSuccess);
      router.push(`/${lang}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (
          error.status === 403 &&
          error.data?.requires_verification &&
          error.data?.email
        ) {
          toast.warning(error.data?.message || t.otpSentTo);
          router.push(
            `/${lang}/verify-otp?email=${encodeURIComponent(error.data.email)}`
          );
          return;
        }

        const fieldMessage = applyServerErrors(setError, error.data);
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
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

      <GlassAuthInput
        id="password"
        label={t.password}
        icon={Lock}
        showPasswordToggle
        maxLength={50}
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />

      <div className="flex justify-end">
        <Link
          href={`/${lang}/forgot-password`}
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-amber-400 transition-colors duration-200 hover:text-amber-300"
        >
          {t.forgotPassword}
        </Link>
      </div>

      {formError ? (
        <p className="text-start text-sm text-red-300" role="alert">
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
        {isSubmitting ? t.submitting : t.loginButton}
      </motion.button>

      <div className="relative py-2 text-center text-xs uppercase tracking-wider text-gray-500">
        <span className="relative z-10 px-3">{t.or}</span>
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />
      </div>

      <GoogleAuthButton label={t.googleLogin} />

      <p className="text-center text-sm text-gray-400">
        {t.noAccount}{' '}
        <Link
          href={`/${lang}/register`}
          className="font-semibold text-gold-300 transition-colors duration-200 hover:text-gold-200"
        >
          {t.registerLink}
        </Link>
      </p>
    </form>
  );
}
