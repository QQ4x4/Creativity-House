'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Elements } from '@stripe/react-stripe-js';
import {
  ChevronDown,
  CreditCard,
  Lock,
  Mail,
  ShieldCheck,
  User,
  Loader2,
} from 'lucide-react';
import PublicShell from '@/components/catalog/PublicShell';
import GlassAuthInput from '@/components/auth/GlassAuthInput';
import GlassPhoneInput from '@/components/auth/GlassPhoneInput';
import GlassCountrySelect from '@/components/checkout/GlassCountrySelect';
import StripePaymentForm from '@/components/checkout/StripePaymentForm';
import { fetchPublicCourse } from '@/lib/catalog/api';
import { createPaymentIntent } from '@/lib/checkout/api';
import { getStripePromise, getStripePublishableKey } from '@/lib/checkout/stripe';
import { applyServerErrors } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import {
  CHECKOUT_FIELD_MAP,
  createCheckoutBillingSchema,
} from '@/lib/validations/checkout';
import { remapServerErrors } from '@/lib/validations/profile';
import { FIELD_LIMITS } from '@/lib/fieldLimits';
import { toastApiError } from '@/lib/toast';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from 'next-themes';
import { useDefaultPhoneCountry } from '@/hooks/useDefaultPhoneCountry';

const stripePublishableKey = getStripePublishableKey();
const stripePromise = getStripePromise();

function CheckoutBody({ dictionary, lang }) {
  const labels = dictionary.catalog;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const defaultCountry = useDefaultPhoneCountry('YE');
  const [mounted, setMounted] = useState(false);
  const slug = searchParams.get('course') || '';
  const mode = searchParams.get('mode') || 'live';

  const [course, setCourse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [billingDetails, setBillingDetails] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Match GlassAuthInput variant="portal" (Contact Us / checkout inputs).
  const stripeAppearance = useMemo(() => {
    if (!mounted) return undefined;
    const isDark = resolvedTheme === 'dark';
    return {
      theme: isDark ? 'night' : 'stripe',
      variables: {
        colorPrimary: isDark ? '#fbbf24' : '#a855f7', // amber-400 / purple-500
        colorBackground: 'transparent',
        colorText: isDark ? '#ffffff' : '#111827', // white / gray-900
        colorTextSecondary: isDark ? '#d1d5db' : '#374151', // gray-300 / gray-700
        colorTextPlaceholder: isDark ? '#6b7280' : '#9ca3af', // gray-500 / gray-400
        colorDanger: isDark ? '#f87171' : '#dc2626',
        fontFamily: 'inherit',
        borderRadius: '16px', // rounded-2xl
        spacingUnit: '4px',
      },
      rules: {
        '.Label': {
          color: isDark ? '#d1d5db' : '#374151', // dark:text-gray-300 / text-gray-700
          fontWeight: '500',
          fontSize: '14px',
        },
        '.Input': {
          // portal: bg-gray-50 / dark:bg-black/20 — no solid fills
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(249, 250, 251, 0.9)',
          color: isDark ? '#ffffff' : '#111827',
          border: isDark
            ? '1px solid rgba(255, 255, 255, 0.1)' // dark:border-white/10
            : '1px solid #d1d5db', // border-gray-300
          boxShadow: 'none',
          padding: '14px 16px',
        },
        '.Input:hover': {
          border: isDark
            ? '1px solid rgba(255, 255, 255, 0.2)'
            : '1px solid #9ca3af', // hover:border-gray-400
        },
        '.Input:focus': {
          border: isDark
            ? '1px solid rgba(251, 191, 36, 0.6)' // dark:focus:border-amber-400/60
            : '1px solid #a855f7', // focus:border-purple-500
          boxShadow: isDark
            ? '0 0 0 2px rgba(251, 191, 36, 0.2)'
            : '0 0 0 2px rgba(168, 85, 247, 0.2)',
          outline: 'none',
        },
        '.Input--invalid': {
          border: '1px solid rgba(248, 113, 113, 0.7)',
        },
        '.Tab': {
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(249, 250, 251, 0.9)',
          border: isDark
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid #d1d5db',
          borderRadius: '16px',
        },
        '.Tab--selected': {
          border: isDark
            ? '1px solid rgba(251, 191, 36, 0.6)'
            : '1px solid #a855f7',
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(249, 250, 251, 1)',
        },
        '.TabLabel, .TabIcon': {
          color: isDark ? '#d1d5db' : '#374151',
        },
      },
    };
  }, [resolvedTheme, mounted]);

  const billingForm = useForm({
    resolver: zodResolver(createCheckoutBillingSchema(lang)),
    mode: 'onBlur',
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      country: '',
    },
  });

  useEffect(() => {
    if (!defaultCountry) return;
    const current = billingForm.getValues('country');
    if (!current) {
      billingForm.setValue('country', defaultCountry, { shouldValidate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCountry]);

  useEffect(() => {
    if (!user) return;
    const first = user.first_name || user.firstName || '';
    const last = user.last_name || user.lastName || '';
    billingForm.reset({
      fullName: user.name || `${first} ${last}`.trim(),
      email: user.email || '',
      phoneNumber: user.phone_number || user.phoneNumber || '',
      country: billingForm.getValues('country') || defaultCountry || '',
    });
    // Prefill once the signed-in profile arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.email, user?.first_name, user?.last_name, user?.phone_number, user?.name]);

  useEffect(() => {
    let cancelled = false;
    if (!slug) {
      setIsLoading(false);
      setCourse(null);
      return undefined;
    }
    (async () => {
      setIsLoading(true);
      try {
        const { data } = await fetchPublicCourse(slug, lang);
        if (cancelled) return;
        setCourse(data);

        // Already purchased — skip checkout and open the student player.
        if (data?.isEnrolled || data?.is_enrolled) {
          router.replace(
            data?.id
              ? `/${lang}/courses/${data.id}/learn`
              : `/${lang}/my-courses`
          );
        }
      } catch {
        if (!cancelled) setCourse(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, lang, router]);

  const selected = course?.modes?.[mode] || course?.modes?.[course?.defaultMode];
  const total = selected?.price ?? course?.price;

  const goToPayment = async () => {
    const valid = await billingForm.trigger();
    if (!valid || !course?.id) return;

    const billing = billingForm.getValues();
    setIsCreatingIntent(true);
    try {
      const result = await createPaymentIntent({
        courseId: course.id,
        mode,
        email: billing.email,
        name: billing.fullName,
        phone: billing.phoneNumber,
      });

      const secret =
        result?.clientSecret || result?.data?.client_secret || result?.client_secret;
      const intentId =
        result?.data?.payment_intent_id || result?.payment_intent_id || '';
      const chargedCents = Number(result?.data?.amount);

      if (!secret) {
        throw new Error(labels.genericError);
      }

      // Refuse step 2 if server amount does not match the UI total (tamper / stale price).
      const displayedCents =
        total != null && Number.isFinite(Number(total))
          ? Math.round(Number(total) * 100)
          : null;
      if (
        displayedCents != null &&
        Number.isFinite(chargedCents) &&
        chargedCents !== displayedCents
      ) {
        throw new Error(
          labels.priceMismatch ||
            'The checkout price changed. Please refresh and try again.'
        );
      }

      setBillingDetails({
        name: billing.fullName,
        email: billing.email,
        phone: billing.phoneNumber,
        countryCode: String(billing.country || '').trim().toUpperCase(),
      });
      setClientSecret(secret);
      setPaymentIntentId(intentId);
      setStep(2);
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 400 || error.data?.already_enrolled)
      ) {
        router.replace(
          course?.id
            ? `/${lang}/courses/${course.id}/learn`
            : `/${lang}/my-courses`
        );
        return;
      }
      const fieldMessage = applyServerErrors(
        billingForm.setError,
        remapServerErrors(error?.data, CHECKOUT_FIELD_MAP)
      );
      if (error instanceof ApiError && error.status === 422) {
        setStep(1);
      }
      if (!fieldMessage) toastApiError(error, labels.genericError);
    } finally {
      setIsCreatingIntent(false);
    }
  };

  return (
    <PublicShell dictionary={dictionary} lang={lang}>
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plum-700 dark:text-gold-300">
          {labels.secureCheckoutBadge}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-white">
          {labels.checkoutTitle}
        </h1>
        <p className="mt-2 max-w-2xl text-gray-600 dark:text-gray-300">
          {labels.checkoutSubtitle}
        </p>

        {isLoading ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_22rem]">
            <div className="h-[32rem] animate-pulse rounded-3xl bg-gray-200 dark:bg-[#181124]/60" />
            <div className="h-80 animate-pulse rounded-3xl bg-gray-200 dark:bg-[#181124]/60" />
          </div>
        ) : !course ? (
          <p className="mt-8 text-gray-600 dark:text-gray-400">
            {dictionary.dashboard.courseNotFound}
          </p>
        ) : (
          <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_24rem]">
            <div className="space-y-4">
              <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-purple-500/20 dark:bg-[#181124]/90">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex min-h-[56px] w-full items-center justify-between gap-3 px-5 py-4 text-start"
                  aria-expanded={step === 1}
                >
                  <span className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-plum-700 text-sm font-bold text-white">
                      1
                    </span>
                    <span className="text-base font-bold text-gray-900 dark:text-white">
                      {labels.billingStep}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${step === 1 ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>

                <AnimatePresence initial={false}>
                  {step === 1 ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-5 border-t border-gray-200 px-5 py-5 dark:border-white/10">
                        <GlassAuthInput
                          id="checkout-full-name"
                          label={labels.fullName || dictionary.auth.fullName || 'Full name'}
                          icon={User}
                          maxLength={FIELD_LIMITS.name * 2}
                          autoComplete="name"
                          error={billingForm.formState.errors.fullName?.message}
                          variant="portal"
                          {...billingForm.register('fullName')}
                        />

                        <GlassAuthInput
                          id="checkout-email"
                          type="email"
                          label={dictionary.auth.email}
                          icon={Mail}
                          maxLength={FIELD_LIMITS.email}
                          autoComplete="email"
                          error={billingForm.formState.errors.email?.message}
                          variant="portal"
                          {...billingForm.register('email')}
                        />

                        <Controller
                          control={billingForm.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <GlassPhoneInput
                              id="checkout-phone"
                              label={dictionary.auth.phone}
                              lang={lang}
                              name={field.name}
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              error={billingForm.formState.errors.phoneNumber?.message}
                              variant="portal"
                            />
                          )}
                        />

                        <Controller
                          control={billingForm.control}
                          name="country"
                          render={({ field }) => (
                            <GlassCountrySelect
                              id="checkout-country"
                              label={labels.country || 'Country'}
                              placeholder={
                                labels.countryPlaceholder || 'Select country'
                              }
                              lang={lang}
                              name={field.name}
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              error={billingForm.formState.errors.country?.message}
                            />
                          )}
                        />

                        {billingForm.formState.errors.root?.message ? (
                          <p className="text-sm text-red-600 dark:text-red-300" role="alert">
                            {billingForm.formState.errors.root.message}
                          </p>
                        ) : null}

                        <button
                          type="button"
                          onClick={goToPayment}
                          disabled={isCreatingIntent}
                          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-plum-700 to-plum-500 px-5 text-sm font-semibold text-white transition-all duration-300 hover:from-plum-600 hover:to-plum-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          {isCreatingIntent ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : null}
                          {isCreatingIntent
                            ? labels.processing
                            : labels.continueToPayment}
                        </button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </section>

              <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-purple-500/20 dark:bg-[#181124]/90">
                <button
                  type="button"
                  onClick={goToPayment}
                  className="flex min-h-[56px] w-full items-center justify-between gap-3 px-5 py-4 text-start"
                  aria-expanded={step === 2}
                >
                  <span className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-plum-700 text-sm font-bold text-white">
                      2
                    </span>
                    <span className="text-base font-bold text-gray-900 dark:text-white">
                      {labels.paymentStep}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${step === 2 ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>

                <AnimatePresence initial={false}>
                  {step === 2 ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-5 border-t border-gray-200 px-5 py-5 dark:border-white/10">
                        {!stripePublishableKey || !stripePromise ? (
                          <p className="text-sm text-red-600 dark:text-red-300" role="alert">
                            Stripe publishable key is not configured.
                          </p>
                        ) : clientSecret && mounted && stripeAppearance ? (
                          <Elements
                            key={`stripe-elements-${resolvedTheme}`}
                            stripe={stripePromise}
                            options={{
                              clientSecret,
                              appearance: stripeAppearance,
                            }}
                          >
                            <StripePaymentForm
                              labels={labels}
                              lang={lang}
                              paymentIntentId={paymentIntentId}
                              billingDetails={billingDetails}
                            />
                          </Elements>
                        ) : clientSecret && !mounted ? (
                          <div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/10" />
                        ) : (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {labels.continueToPayment}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </section>

              <Link
                href={`/${lang}/courses/${course.slug}`}
                className="inline-flex min-h-[44px] items-center text-sm font-medium text-gray-600 hover:text-plum-700 dark:text-gray-400 dark:hover:text-gold-300"
              >
                {labels.backToCourse}
              </Link>
            </div>

            <aside className="lg:sticky lg:top-28">
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-purple-500/20 dark:bg-[#181124]/90 sm:p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {labels.orderSummary}
                </h2>

                <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10">
                  {course.coverImage ? (
                    <img
                      src={course.coverImage}
                      alt=""
                      width={640}
                      height={360}
                      className="aspect-video w-full object-cover"
                    />
                  ) : null}
                </div>

                <p className="mt-4 text-base font-bold text-gray-900 dark:text-white">
                  {course.title}
                </p>
                <span className="mt-2 inline-flex rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-plum-800 dark:border-gold-400/30 dark:bg-gold-400/10 dark:text-gold-200">
                  {labels.modes[mode] || course.badge || mode}
                </span>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {labels.selectedMode}: {labels.modes[mode] || mode}
                </p>

                <div className="mt-5 flex items-end justify-between border-t border-gray-200 pt-4 dark:border-white/10">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {labels.total}
                  </span>
                  <span className="text-2xl font-extrabold text-plum-700 dark:text-gold-300">
                    ${total}
                  </span>
                </div>

                <ul className="mt-5 space-y-2.5">
                  <li className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300">
                    <Lock
                      className="mt-0.5 h-4 w-4 shrink-0 text-plum-700 dark:text-gold-300"
                      aria-hidden
                    />
                    {labels.sslBadge}
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300">
                    <ShieldCheck
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300"
                      aria-hidden
                    />
                    {labels.guaranteeBadge}
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300">
                    <CreditCard
                      className="mt-0.5 h-4 w-4 shrink-0 text-plum-700 dark:text-gold-300"
                      aria-hidden
                    />
                    {labels.stripeBadge}
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        )}
      </div>
    </PublicShell>
  );
}

export default function CheckoutClient({ dictionary, lang }) {
  return (
    <Suspense
      fallback={
        <PublicShell dictionary={dictionary} lang={lang}>
          <div className="mx-auto max-w-6xl px-4 pb-20 pt-32">
            <div className="h-64 animate-pulse rounded-3xl bg-gray-200 dark:bg-[#181124]/60" />
          </div>
        </PublicShell>
      }
    >
      <CheckoutBody dictionary={dictionary} lang={lang} />
    </Suspense>
  );
}
