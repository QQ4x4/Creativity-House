'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  CreditCard,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';
import PublicShell from '@/components/catalog/PublicShell';
import GlassAuthInput from '@/components/auth/GlassAuthInput';
import GlassPhoneInput from '@/components/auth/GlassPhoneInput';
import GlassCountrySelect from '@/components/checkout/GlassCountrySelect';
import StripeMockFields from '@/components/checkout/StripeMockFields';
import CheckoutSuccessModal from '@/components/checkout/CheckoutSuccessModal';
import { fetchPublicCourse } from '@/lib/catalog/api';
import { processCheckout } from '@/lib/checkout/api';
import { applyServerErrors } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import {
  CHECKOUT_FIELD_MAP,
  createCheckoutBillingSchema,
  createCheckoutCardSchema,
} from '@/lib/validations/checkout';
import { remapServerErrors } from '@/lib/validations/profile';
import { toastApiError } from '@/lib/toast';
import { useAuth } from '@/providers/AuthProvider';

function CheckoutBody({ dictionary, lang }) {
  const labels = dictionary.catalog;
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const slug = searchParams.get('course') || '';
  const mode = searchParams.get('mode') || 'live';

  const [course, setCourse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [card, setCard] = useState({ cardNumber: '', expiry: '', cvc: '' });
  const [cardErrors, setCardErrors] = useState({});
  const [success, setSuccess] = useState({ open: false, orderId: '', requiresLogin: false });

  const billingForm = useForm({
    resolver: zodResolver(createCheckoutBillingSchema(lang)),
    mode: 'onBlur',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      country: '',
    },
  });

  useEffect(() => {
    if (!user) return;
    billingForm.reset({
      firstName: user.first_name || user.firstName || '',
      lastName: user.last_name || user.lastName || '',
      email: user.email || '',
      phoneNumber: user.phone_number || user.phoneNumber || '',
      country: billingForm.getValues('country') || '',
    });
    // Prefill once the signed-in profile arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.email, user?.first_name, user?.last_name, user?.phone_number]);

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
        if (!cancelled) setCourse(data);
      } catch {
        if (!cancelled) setCourse(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, lang]);

  const selected = course?.modes?.[mode] || course?.modes?.[course?.defaultMode];
  const total = selected?.price ?? course?.price;
  const cardSchema = useMemo(() => createCheckoutCardSchema(lang), [lang]);

  const goToPayment = async () => {
    const valid = await billingForm.trigger();
    if (valid) setStep(2);
  };

  const handlePay = billingForm.handleSubmit(async (billing) => {
    const parsed = cardSchema.safeParse(card);
    if (!parsed.success) {
      const next = {};
      parsed.error.issues.forEach((issue) => {
        next[issue.path[0]] = issue.message;
      });
      setCardErrors(next);
      setStep(2);
      return;
    }
    setCardErrors({});

    try {
      const result = await processCheckout({
        ...billing,
        courseId: course?.id,
        courseSlug: course?.slug || slug,
        mode,
      });

      if (result?.session_started) {
        await refreshUser();
      }

      setSuccess({
        open: true,
        orderId: result?.order?.order_id || '',
        requiresLogin: Boolean(result?.requires_login),
      });
    } catch (error) {
      const fieldMessage = applyServerErrors(
        billingForm.setError,
        remapServerErrors(error?.data, CHECKOUT_FIELD_MAP)
      );
      if (error instanceof ApiError && error.status === 422) {
        setStep(1);
      }
      if (!fieldMessage) toastApiError(error, labels.genericError);
    }
  });

  return (
    <PublicShell dictionary={dictionary} lang={lang}>
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plum-700 dark:text-gold-300">
          {labels.secureCheckoutBadge}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-white">{labels.checkoutTitle}</h1>
        <p className="mt-2 max-w-2xl text-gray-600 dark:text-gray-400">{labels.checkoutSubtitle}</p>

        {isLoading ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_22rem]">
            <div className="h-[32rem] animate-pulse rounded-3xl bg-gray-200 dark:bg-[#181124]/60" />
            <div className="h-80 animate-pulse rounded-3xl bg-gray-200 dark:bg-[#181124]/60" />
          </div>
        ) : !course ? (
          <p className="mt-8 text-gray-600 dark:text-gray-400">{dictionary.dashboard.courseNotFound}</p>
        ) : (
          <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_24rem]">
            <form onSubmit={handlePay} className="space-y-4" noValidate>
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
                    <span className="text-base font-bold text-gray-900 dark:text-white">{labels.billingStep}</span>
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
                        <div className="grid gap-5 sm:grid-cols-2">
                          <GlassAuthInput
                            id="checkout-first-name"
                            label={dictionary.auth.firstName}
                            icon={User}
                            autoComplete="given-name"
                            error={billingForm.formState.errors.firstName?.message}
                            variant="portal"
                            {...billingForm.register('firstName')}
                          />
                          <GlassAuthInput
                            id="checkout-last-name"
                            label={dictionary.auth.lastName}
                            icon={User}
                            autoComplete="family-name"
                            error={billingForm.formState.errors.lastName?.message}
                            variant="portal"
                            {...billingForm.register('lastName')}
                          />
                        </div>

                        <GlassAuthInput
                          id="checkout-email"
                          type="email"
                          label={dictionary.auth.email}
                          icon={Mail}
                          dir="ltr"
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
                              label={labels.country}
                              placeholder={labels.countryPlaceholder}
                              lang={lang}
                              name={field.name}
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              error={billingForm.formState.errors.country?.message}
                            />
                          )}
                        />

                        <button
                          type="button"
                          onClick={goToPayment}
                          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-plum-700 to-plum-500 px-5 text-sm font-semibold text-white transition-all duration-300 hover:from-plum-600 hover:to-plum-400 sm:w-auto"
                        >
                          {labels.continueToPayment}
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
                    <span className="text-base font-bold text-gray-900 dark:text-white">{labels.paymentStep}</span>
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
                        <StripeMockFields
                          labels={labels}
                          values={card}
                          errors={cardErrors}
                          onChange={(key, value) => {
                            setCard((current) => ({ ...current, [key]: value }));
                            setCardErrors((current) => ({ ...current, [key]: undefined }));
                          }}
                        />

                        {billingForm.formState.errors.root?.message ? (
                          <p className="text-sm text-red-600 dark:text-red-300" role="alert">
                            {billingForm.formState.errors.root.message}
                          </p>
                        ) : null}

                        <button
                          type="submit"
                          disabled={billingForm.formState.isSubmitting}
                          className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-plum-700 via-plum-600 to-gold-500 px-6 text-base font-bold text-white shadow-[0_0_32px_rgba(168,85,247,0.35)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(212,175,55,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Lock className="h-4 w-4" aria-hidden />
                          {billingForm.formState.isSubmitting ? labels.processing : labels.completePayment}
                        </button>
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
            </form>

            <aside className="lg:sticky lg:top-28">
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-purple-500/20 dark:bg-[#181124]/90 sm:p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{labels.orderSummary}</h2>

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

                <p className="mt-4 text-base font-bold text-gray-900 dark:text-white">{course.title}</p>
                <span className="mt-2 inline-flex rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-plum-800 dark:border-gold-400/30 dark:bg-gold-400/10 dark:text-gold-200">
                  {labels.modes[mode] || course.badge || mode}
                </span>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {labels.selectedMode}: {labels.modes[mode] || mode}
                </p>

                <div className="mt-5 flex items-end justify-between border-t border-gray-200 pt-4 dark:border-white/10">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{labels.total}</span>
                  <span className="text-2xl font-extrabold text-plum-700 dark:text-gold-300">${total}</span>
                </div>

                <ul className="mt-5 space-y-2.5">
                  <li className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-plum-700 dark:text-gold-300" aria-hidden />
                    {labels.sslBadge}
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden />
                    {labels.guaranteeBadge}
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300">
                    <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-plum-700 dark:text-gold-300" aria-hidden />
                    {labels.stripeBadge}
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        )}
      </div>

      <CheckoutSuccessModal
        open={success.open}
        labels={labels}
        lang={lang}
        orderId={success.orderId}
        requiresLogin={success.requiresLogin}
        onClose={() => setSuccess((current) => ({ ...current, open: false }))}
      />
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
