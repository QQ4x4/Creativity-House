'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { Loader2 } from 'lucide-react';
import GlassPhoneInput from '@/components/auth/GlassPhoneInput';
import { applyServerErrors } from '@/lib/auth';
import { ApiError, apiPatch, getCsrfCookie } from '@/lib/api';
import { toastApiError } from '@/lib/toast';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';

const E164 = /^\+[1-9]\d{6,14}$/;

function createSchema(lang) {
  const phoneRequired =
    lang === 'ar' ? 'رقم الهاتف مطلوب.' : 'Phone number is required.';
  const phoneInvalid =
    lang === 'ar'
      ? 'أدخل رقم هاتف دولي صالحًا.'
      : 'Enter a valid international phone number.';

  return z.object({
    phone_number: z
      .string({ required_error: phoneRequired })
      .trim()
      .min(1, phoneRequired)
      .max(20)
      .refine((value) => E164.test(value) && isValidPhoneNumber(value), {
        message: phoneInvalid,
      }),
  });
}

export default function CompleteProfileForm({ dictionary, lang }) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [formError, setFormError] = useState('');
  const t = dictionary.auth;

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createSchema(lang)),
    defaultValues: { phone_number: '' },
  });

  const onSubmit = async (values) => {
    setFormError('');

    try {
      await getCsrfCookie();
      const data = await apiPatch('/auth/complete-profile', {
        phone_number: values.phone_number.trim(),
      });

      if (data?.user) {
        setUser(data.user);
      }

      toast.success(t.completeProfileSuccess || 'Profile completed successfully.');
      router.replace(`/${lang}`);
    } catch (error) {
      if (error instanceof ApiError) {
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
        className="flex min-h-[48px] w-full max-w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-plum-700 via-plum-600 to-gold-600 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_-10px_rgba(107,55,98,0.7)] transition-opacity duration-200 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t.submitting}
          </>
        ) : (
          t.completeProfileButton
        )}
      </motion.button>
    </form>
  );
}
