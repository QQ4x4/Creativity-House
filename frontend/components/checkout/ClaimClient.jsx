'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Lock, Loader2, ShieldCheck } from 'lucide-react';
import PublicShell from '@/components/catalog/PublicShell';
import GlassAuthInput from '@/components/auth/GlassAuthInput';
import {
  claimAccount,
  fetchClaimInfo,
  resendClaimCode,
} from '@/lib/checkout/api';
import { applyServerErrors } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import {
  CHECKOUT_FIELD_MAP,
  createClaimAccountSchema,
} from '@/lib/validations/checkout';
import { remapServerErrors } from '@/lib/validations/profile';
import { FIELD_LIMITS } from '@/lib/fieldLimits';
import { toastApiError } from '@/lib/toast';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import { trackPurchase } from '@/lib/tracking';

function formatMoney(amount, currency) {
  const n = Number(amount);
  const code = String(currency || 'USD').toUpperCase();
  if (!Number.isFinite(n)) return code;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${code} ${n.toFixed(2)}`;
  }
}

function ClaimBody({ dictionary, lang }) {
  const labels = dictionary.catalog;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setUser, refreshUser } = useAuth();

  // Stripe appends `payment_intent`; our confirmPayment return_url sets `session_id`.
  const paymentIntentId = useMemo(() => {
    const candidates = [
      searchParams.get('payment_intent'),
      searchParams.get('session_id'),
      searchParams.get('payment_intent_id'),
    ];
    for (const value of candidates) {
      const trimmed = String(value || '').trim();
      if (trimmed.startsWith('pi_')) return trimmed;
    }
    return String(candidates.find(Boolean) || '').trim();
  }, [searchParams]);

  const [info, setInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isResending, setIsResending] = useState(false);

  const form = useForm({
    resolver: zodResolver(createClaimAccountSchema(lang)),
    mode: 'onBlur',
    defaultValues: {
      code: '',
      password: '',
      passwordConfirmation: '',
    },
  });

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let retryTimer;

    if (!paymentIntentId) {
      setIsLoading(false);
      setLoadError(labels.claimMissingPayment || 'Missing payment reference.');
      return undefined;
    }

    const load = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const result = await fetchClaimInfo(paymentIntentId);
        if (cancelled) return;

        const data = result?.data || result;
        if (!data || (!data.course && data.amount == null)) {
          throw new ApiError(
            labels.claimProcessing ||
              'Payment confirmation is still processing. Please wait a moment.',
            404,
            result
          );
        }

        setInfo(data);
        setIsLoading(false);

        // Client Purchase (shares payment_intent id with Stripe webhook CAPI).
        try {
          const amount =
            data?.amount != null && Number.isFinite(Number(data.amount))
              ? Number(data.amount)
              : null;
          trackPurchase({
            sessionId: data?.payment_intent_id || paymentIntentId,
            value: amount,
            currency: data?.currency || 'USD',
            items: data?.course
              ? [
                  {
                    item_id: String(data.course.id ?? ''),
                    item_name: data.course.title || data.course.slug || 'Course',
                    price: amount ?? undefined,
                    quantity: 1,
                  },
                ]
              : [],
          });
        } catch {
          // non-blocking
        }

        if (data?.already_active) {
          const courseId = data?.course?.id;
          router.replace(
            courseId
              ? `/${lang}/courses/${courseId}/learn`
              : `/${lang}/my-courses`
          );
          return;
        }

        if (!data?.requires_claim) {
          const courseId = data?.course?.id;
          router.replace(
            courseId
              ? `/${lang}/courses/${courseId}/learn`
              : `/${lang}/my-courses`
          );
        }
      } catch (error) {
        if (cancelled) return;

        const stillProcessing =
          error instanceof ApiError &&
          (error.status === 404 ||
            /still processing/i.test(String(error.message || '')));

        if (stillProcessing && attempts < 8) {
          attempts += 1;
          // Keep loading UI visible while self-heal / webhook catches up.
          setIsLoading(true);
          retryTimer = window.setTimeout(load, 1500);
          return;
        }

        setLoadError(
          error?.message ||
            labels.claimProcessing ||
            labels.genericError ||
            'Payment confirmation is still processing.'
        );
        setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [
    paymentIntentId,
    lang,
    labels.claimMissingPayment,
    labels.claimProcessing,
    labels.genericError,
    router,
  ]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!paymentIntentId) return;

    try {
      const result = await claimAccount({
        paymentIntentId: info?.payment_intent_id || paymentIntentId,
        code: values.code,
        password: values.password,
        passwordConfirmation: values.passwordConfirmation,
      });

      if (result?.token && typeof window !== 'undefined') {
        window.localStorage.setItem('auth_token', result.token);
      }

      if (result?.user) {
        setUser(result.user);
      } else {
        await refreshUser();
      }

      const courseId = result?.data?.course_id || info?.course?.id;
      toast.success(
        labels.claimSuccess || 'Account activated. Opening your courses…'
      );
      // Student learning hub — not the public marketing course page.
      router.replace(
        courseId
          ? `/${lang}/courses/${courseId}/learn`
          : `/${lang}/my-courses`
      );
    } catch (error) {
      const fieldMessage = applyServerErrors(
        form.setError,
        remapServerErrors(error?.data, CHECKOUT_FIELD_MAP)
      );
      if (!fieldMessage) toastApiError(error, labels.genericError);
    }
  });

  const handleResend = async () => {
    if (!paymentIntentId || isResending) return;

    setIsResending(true);
    try {
      await resendClaimCode({
        paymentIntentId: info?.payment_intent_id || paymentIntentId,
      });
      toast.success(labels.claimResent || 'If eligible, a new code was sent.');
    } catch (error) {
      toastApiError(error, labels.genericError);
    } finally {
      setIsResending(false);
    }
  };

  const showSummary = Boolean(info) && !isLoading && !loadError;
  const showClaimForm = showSummary && Boolean(info?.requires_claim);

  return (
    <PublicShell dictionary={dictionary} lang={lang}>
      <div className="mx-auto max-w-xl px-4 pb-20 pt-28 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plum-700 dark:text-gold-300">
          {labels.secureCheckoutBadge}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-white">
          {labels.claimTitle ||
            'Payment Confirmed! Set your password to unlock your course.'}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {labels.claimSubtitle ||
            'Enter the 6-digit code from your email, then choose a password.'}
        </p>

        {isLoading ? (
          <div className="mt-10 space-y-4">
            <div className="h-40 animate-pulse rounded-3xl bg-gray-200 dark:bg-[#181124]/60" />
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              {labels.claimProcessing ||
                'Confirming your payment and preparing your account…'}
            </p>
            <div className="flex justify-center">
              <Loader2
                className="h-5 w-5 animate-spin text-plum-700 dark:text-gold-300"
                aria-hidden
              />
            </div>
          </div>
        ) : loadError ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200">
            {loadError}
            <div className="mt-4">
              <Link
                href={`/${lang}/courses`}
                className="font-semibold text-plum-700 underline dark:text-gold-300"
              >
                {labels.breadcrumbCourses}
              </Link>
            </div>
          </div>
        ) : showSummary ? (
          <div className="mt-8 space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-purple-500/20 dark:bg-[#181124]/90 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {labels.orderSummary}
              </h2>
              <p className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
                {info?.course?.title || '—'}
              </p>
              <div className="mt-4 flex items-end justify-between border-t border-gray-200 pt-4 dark:border-white/10">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {labels.total}
                </span>
                <span className="text-2xl font-extrabold text-plum-700 dark:text-gold-300">
                  {formatMoney(info?.amount, info?.currency)}
                </span>
              </div>
              {info?.order_reference ? (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {labels.orderRef}: {info.order_reference}
                </p>
              ) : null}
            </div>

            {showClaimForm ? (
              <form
                onSubmit={onSubmit}
                className="space-y-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-purple-500/20 dark:bg-[#181124]/90 sm:p-6"
                noValidate
              >
                {info?.email ? (
                  <p className="text-sm text-gray-600 dark:text-gray-300" dir="ltr">
                    {(
                      labels.claimCodeSentTo ||
                      'We sent a 6-digit code to {email}'
                    ).replace('{email}', info.email)}
                  </p>
                ) : null}

                <GlassAuthInput
                  id="claim-otp"
                  label={labels.claimOtpLabel || '6-digit code'}
                  icon={KeyRound}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  dir="ltr"
                  error={form.formState.errors.code?.message}
                  variant="portal"
                  {...form.register('code')}
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="text-sm font-semibold text-plum-700 hover:underline disabled:opacity-60 dark:text-gold-300"
                  >
                    {isResending
                      ? labels.processing
                      : labels.claimResend || 'Resend code'}
                  </button>
                </div>

                <GlassAuthInput
                  id="claim-password"
                  type="password"
                  label={
                    labels.claimPassword ||
                    dictionary.auth.password ||
                    'New password'
                  }
                  icon={Lock}
                  autoComplete="new-password"
                  maxLength={FIELD_LIMITS.password}
                  error={form.formState.errors.password?.message}
                  variant="portal"
                  {...form.register('password')}
                />

                <GlassAuthInput
                  id="claim-password-confirm"
                  type="password"
                  label={
                    labels.claimPasswordConfirm ||
                    dictionary.auth.confirmPassword ||
                    'Confirm password'
                  }
                  icon={ShieldCheck}
                  autoComplete="new-password"
                  maxLength={FIELD_LIMITS.password}
                  error={form.formState.errors.passwordConfirmation?.message}
                  variant="portal"
                  {...form.register('passwordConfirmation')}
                />

                {form.formState.errors.root?.message ? (
                  <p className="text-sm text-red-600 dark:text-red-300" role="alert">
                    {form.formState.errors.root.message}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-plum-700 via-plum-600 to-gold-500 px-6 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {form.formState.isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Lock className="h-4 w-4" aria-hidden />
                  )}
                  {form.formState.isSubmitting
                    ? labels.processing
                    : labels.claimSubmit || 'Complete Account Setup'}
                </button>
              </form>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {labels.claimRedirecting || 'Opening your course…'}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </PublicShell>
  );
}

export default function ClaimClient({ dictionary, lang }) {
  return (
    <Suspense
      fallback={
        <PublicShell dictionary={dictionary} lang={lang}>
          <div className="mx-auto max-w-xl px-4 pb-20 pt-32">
            <div className="h-64 animate-pulse rounded-3xl bg-gray-200 dark:bg-[#181124]/60" />
          </div>
        </PublicShell>
      }
    >
      <ClaimBody dictionary={dictionary} lang={lang} />
    </Suspense>
  );
}
