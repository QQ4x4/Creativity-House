'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import OtpInput from '@/components/auth/OtpInput';
import { ApiError, apiPost, getCsrfCookie } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { toastApiError } from '@/lib/toast';
import { toast } from 'sonner';

const RESEND_SECONDS = 60;

export default function VerifyOtpForm({ dictionary, lang }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, refreshUser } = useAuth();
  const email = (searchParams.get('email') || '').slice(0, 50);
  const t = dictionary.auth;

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (!email) return undefined;
    if (secondsLeft <= 0) return undefined;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [email, secondsLeft]);

  useEffect(() => {
    if (code.length === 6 && !isSubmitting && !success) {
      void verify(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const verify = async (otpCode) => {
    if (!email) {
      setError(t.missingEmail);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await getCsrfCookie();
      const data = await apiPost('/auth/verify-otp', {
        email,
        code: otpCode,
      });

      if (data?.user) {
        setUser(data.user);
      } else {
        await refreshUser();
      }

      setSuccess(true);
      toast.success(t.otpSuccess);
      setTimeout(() => {
        router.push(`/${lang}`);
      }, 700);
    } catch (err) {
      if (err instanceof ApiError) {
        const message =
          err.data?.errors?.code?.[0] || err.data?.message || t.otpInvalid;
        setError(message);
        toastApiError(err, t.otpInvalid);
      } else {
        setError(t.genericError);
        toast.error(t.genericError);
      }
      setCode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resend = async () => {
    if (!email || secondsLeft > 0 || isResending) return;

    setIsResending(true);
    setError('');

    try {
      await getCsrfCookie();
      await apiPost('/auth/resend-otp', { email });
      setSecondsLeft(RESEND_SECONDS);
      setCode('');
      toast.success(t.resendCode);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.data?.message || t.genericError);
        toastApiError(err, t.genericError);
      } else {
        setError(t.genericError);
        toast.error(t.genericError);
      }
    } finally {
      setIsResending(false);
    }
  };

  if (!email) {
    return (
      <div className="space-y-4 text-start">
        <p className="text-sm text-red-300">{t.missingEmail}</p>
        <Link
          href={`/${lang}/register`}
          className="inline-flex min-h-[44px] items-center font-semibold text-gold-300 hover:text-gold-200"
        >
          {t.backToRegister}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-start">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-gold-300">
          <ShieldCheck className="h-4 w-4" aria-hidden />
        </span>
        <p className="text-sm leading-relaxed text-gray-300">
          {t.otpSentTo}{' '}
          <span className="font-semibold text-white" dir="ltr">
            {email}
          </span>
        </p>
      </div>

      <div className="text-start">
        <p className="mb-1.5 ms-1 flex items-center gap-2 text-sm font-medium text-gray-300">
          <ShieldCheck className="h-3.5 w-3.5 text-gold-400/80" aria-hidden />
          <span>{t.verifyCode}</span>
        </p>
        <OtpInput
          value={code}
          onChange={setCode}
          disabled={isSubmitting || success}
          error={error}
        />
      </div>

      <AnimatePresence>
        {success ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="text-sm font-medium text-emerald-300"
          >
            {t.otpSuccess}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        disabled={isSubmitting || code.length !== 6 || success}
        onClick={() => verify(code)}
        whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
        whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
        transition={{ duration: 0.2 }}
        className="flex min-h-[48px] w-full max-w-full items-center justify-center rounded-2xl bg-gradient-to-r from-plum-700 via-plum-600 to-gold-600 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_-10px_rgba(107,55,98,0.7)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
      >
        {isSubmitting ? t.verifying : t.verifyCode}
      </motion.button>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
        <button
          type="button"
          onClick={resend}
          disabled={secondsLeft > 0 || isResending}
          className="min-h-[44px] font-semibold text-gold-300 transition-colors duration-200 hover:text-gold-200 disabled:cursor-not-allowed disabled:text-gray-500"
        >
          {isResending
            ? t.resending
            : secondsLeft > 0
              ? `${t.resendIn} ${secondsLeft}s`
              : t.resendCode}
        </button>

        <Link
          href={`/${lang}/login`}
          className="inline-flex min-h-[44px] items-center hover:text-white"
        >
          {t.backToLogin}
        </Link>
      </div>
    </div>
  );
}
