'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Loader2, Mail, MessageCircle, ShieldCheck, User } from 'lucide-react';
import PublicShell from '@/components/catalog/PublicShell';
import GlassAuthInput from '@/components/auth/GlassAuthInput';
import GlassPhoneInput from '@/components/auth/GlassPhoneInput';
import OrganizationCourseSelect from '@/components/organizations/OrganizationCourseSelect';
import { fetchPublicCatalog } from '@/lib/catalog/api';
import { submitCourseInquiry } from '@/lib/course-inquiry/api';
import { applyServerErrors } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { createCourseInquirySchema } from '@/lib/validations/courseInquiry';
import { toastApiError } from '@/lib/toast';
import { fadeUp, motionGpu, motionViewport } from '@/lib/motion';

const EMPTY_VALUES = {
  name: '',
  email: '',
  phone: '',
  course_id: '',
  message: '',
};

function mapCoursesForSelect(list) {
  return (Array.isArray(list) ? list : []).filter(Boolean).map((course) => ({
    ...course,
    id: course.id ?? course.slug ?? null,
  }));
}

function resolveCourseOptionId(courses, param) {
  const needle = String(param || '').trim();
  if (!needle) return '';

  const match = courses.find((course) => {
    if (!course) return false;
    return String(course.slug || '') === needle || String(course.id ?? '') === needle;
  });

  if (!match || match.id == null || match.id === '') return '';
  return String(match.id);
}

function CourseInquiryFallback({ dictionary, lang }) {
  return (
    <PublicShell dictionary={dictionary} lang={lang}>
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="h-72 animate-pulse rounded-3xl bg-gray-200 dark:bg-[#181124]/60" />
      </div>
    </PublicShell>
  );
}

function CourseInquiryBody({ dictionary, lang }) {
  const labels = dictionary.courseInquiry;
  const searchParams = useSearchParams();
  const courseParam = searchParams.get('course') || '';

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesFailed, setCoursesFailed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createCourseInquirySchema(lang)),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCoursesLoading(true);
      setCoursesFailed(false);
      try {
        const { data } = await fetchPublicCatalog(lang);
        if (!cancelled) {
          setCourses(mapCoursesForSelect(data));
        }
      } catch {
        if (!cancelled) {
          setCourses([]);
          setCoursesFailed(true);
        }
      } finally {
        if (!cancelled) setCoursesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => {
    if (submitted || !courseParam || coursesLoading) return;
    const optionId = resolveCourseOptionId(courses, courseParam);
    if (!optionId) return;
    if (getValues('course_id')) return;
    setValue('course_id', optionId, { shouldDirty: false, shouldValidate: false });
  }, [submitted, courseParam, courses, coursesLoading, getValues, setValue]);

  const onSubmit = async (values) => {
    setFormError('');
    try {
      await submitCourseInquiry(values);
      setSubmitted(true);
      reset(EMPTY_VALUES);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        applyServerErrors(setError, error.data);
      }
      const message = error?.data?.message || error?.message || labels.genericError;
      setFormError(message);
      toastApiError(error, labels.genericError);
    }
  };

  return (
    <PublicShell dictionary={dictionary} lang={lang}>
      <section className="relative z-30 px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 start-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-plum-600/20 blur-3xl" />
          <div className="absolute bottom-0 end-0 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <motion.div
            className={motionGpu}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={motionViewport}
          >
            <span className="inline-flex rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-plum-800 dark:border-gold-400/30 dark:bg-gold-400/10 dark:text-gold-200">
              {labels.badge}
            </span>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight text-gray-900 sm:text-4xl lg:text-5xl dark:text-white">
              {labels.heroTitle}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg dark:text-gray-300">
              {labels.heroSubtitle}
            </p>
            <ul className="mt-8 space-y-3">
              {(labels.points || []).map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-200">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-plum-600 dark:text-gold-400" aria-hidden />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            className={`relative overflow-hidden rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-[#181124]/90 dark:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)] ${motionGpu}`}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={motionViewport}
            custom={1}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-plum-700 via-plum-500 to-gold-500"
            />

            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="flex min-h-[360px] flex-col items-center justify-center py-8 text-center"
                  role="status"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 text-plum-700 dark:bg-gold-400/15 dark:text-gold-300">
                    <CheckCircle2 className="h-8 w-8" aria-hidden />
                  </span>
                  <h2 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">
                    {labels.successTitle}
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {labels.successMessage}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setFormError('');
                    }}
                    className="mt-8 inline-flex min-h-[44px] items-center justify-center rounded-full border border-gray-300 px-5 text-sm font-medium text-gray-800 transition-colors duration-200 hover:border-plum-400 hover:text-plum-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50 dark:border-white/15 dark:text-gray-200 dark:hover:border-gold-400/40 dark:hover:text-gold-300"
                  >
                    {labels.sendAnother}
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  noValidate
                  onSubmit={handleSubmit(onSubmit)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{labels.formTitle}</h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{labels.formSubtitle}</p>
                  </div>

                  <GlassAuthInput
                    id="course-inquiry-name"
                    label={labels.fullName}
                    placeholder={labels.fullNamePlaceholder}
                    autoComplete="name"
                    maxLength={255}
                    icon={User}
                    variant="portal"
                    error={errors.name?.message}
                    {...register('name')}
                  />

                  <GlassAuthInput
                    id="course-inquiry-email"
                    type="email"
                    label={labels.email}
                    placeholder={labels.emailPlaceholder}
                    autoComplete="email"
                    maxLength={255}
                    icon={Mail}
                    variant="portal"
                    error={errors.email?.message}
                    {...register('email')}
                  />

                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <GlassPhoneInput
                        id="course-inquiry-phone"
                        label={
                          <>
                            {labels.phone}{' '}
                            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                              ({labels.phoneOptional})
                            </span>
                          </>
                        }
                        lang={lang}
                        variant="portal"
                        error={errors.phone?.message}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    )}
                  />

                  <Controller
                    name="course_id"
                    control={control}
                    render={({ field }) => (
                      <OrganizationCourseSelect
                        id="course-inquiry-course"
                        label={labels.targetCourse}
                        optionalLabel={labels.targetCourseOptional}
                        placeholder={labels.coursePlaceholder}
                        loadingLabel={labels.loadingCourses}
                        noneLabel={labels.courseNone}
                        error={errors.course_id?.message}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        courses={courses}
                        isLoading={coursesLoading}
                      />
                    )}
                  />

                  {coursesFailed ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{labels.coursesUnavailable}</p>
                  ) : null}

                  <div className="w-full max-w-full text-start">
                    <label
                      htmlFor="course-inquiry-message"
                      className="mb-1.5 ms-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      {labels.message}
                    </label>
                    <textarea
                      id="course-inquiry-message"
                      rows={5}
                      maxLength={5000}
                      placeholder={labels.messagePlaceholder}
                      aria-invalid={Boolean(errors.message)}
                      className={`glass-country-dropdown-scroll min-h-[140px] w-full resize-y rounded-2xl border bg-gray-50 px-4 py-3.5 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:bg-black/20 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-amber-400/60 dark:focus:ring-amber-400/20 ${
                        errors.message
                          ? 'border-red-400/70'
                          : 'border-gray-300 hover:border-gray-400 dark:border-white/10 dark:hover:border-white/20'
                      }`}
                      {...register('message')}
                    />
                    {errors.message ? (
                      <p className="mt-1.5 ms-1 text-sm text-red-600 dark:text-red-300" role="alert">
                        {errors.message.message}
                      </p>
                    ) : null}
                  </div>

                  {formError ? (
                    <p className="text-sm text-red-600 dark:text-red-300" role="alert">
                      {formError}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="relative inline-flex min-h-[48px] w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-6 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(126,34,206,0.65)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_16px_40px_-10px_rgba(212,175,55,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60 disabled:pointer-events-none disabled:opacity-70"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-gold-300/25 to-transparent opacity-70"
                    />
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        <span>{labels.submitting}</span>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" aria-hidden />
                        {labels.submit}
                      </span>
                    )}
                  </button>

                  <p className="flex items-start gap-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" aria-hidden />
                    <span>{labels.secureNote}</span>
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>
    </PublicShell>
  );
}

export default function CourseInquiryClient({ dictionary, lang }) {
  return (
    <Suspense fallback={<CourseInquiryFallback dictionary={dictionary} lang={lang} />}>
      <CourseInquiryBody dictionary={dictionary} lang={lang} />
    </Suspense>
  );
}
