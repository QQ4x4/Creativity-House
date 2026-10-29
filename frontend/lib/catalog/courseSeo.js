/**
 * Helpers for course detail SEO metadata + JSON-LD (shared by the page).
 */

import {
  brandSuffix,
  ensureTitleLength,
  seoConfig,
  stripHtml,
  trimMetaDescription,
} from '@/config/seo';

function pickSeoField(course, lang, enKey, arKey, legacyKey) {
  const localized =
    lang === 'ar'
      ? course?.[arKey] || course?.seo?.[arKey] || course?.seo?.[enKey]
      : course?.[enKey] || course?.seo?.[enKey] || course?.seo?.[arKey];
  if (localized) return String(localized).trim();
  const legacy = course?.[legacyKey] || course?.seo?.[legacyKey === 'seo_title' ? 'title' : 'description'];
  return legacy ? String(legacy).trim() : '';
}

export function buildCourseTitle(course, lang) {
  const custom = pickSeoField(course, lang, 'seo_title_en', 'seo_title_ar', 'seo_title');
  if (custom) return ensureTitleLength(custom, lang);

  const name = course?.title || (lang === 'ar' ? 'الدورة' : 'Course');
  const base = `${name} | ${brandSuffix(lang)}`;
  return ensureTitleLength(base, lang);
}

export function buildCourseDescription(course, lang) {
  const custom = pickSeoField(
    course,
    lang,
    'seo_description_en',
    'seo_description_ar',
    'seo_description'
  );
  if (custom) return trimMetaDescription(custom, 160);

  const fallback =
    course?.subtitle ||
    course?.description ||
    (lang === 'ar'
      ? 'دورة معتمدة في إدارة المشاريع من دار الإبداع، شريك تدريب معتمد من PMI.'
      : 'Accredited project management training from Creativity House, a PMI Authorized Training Partner.');

  return trimMetaDescription(fallback, 155) || fallback;
}

export function absoluteUrl(path) {
  const base = seoConfig.siteUrl.replace(/\/+$/, '');
  if (!path) return base;
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildCourseFaqItems(course, dictionary, lang) {
  const pack = dictionary?.seoPages?.courseDetail;
  if (!pack?.faq?.length) return [];

  const language =
    course?.language ||
    (lang === 'ar' ? course?.language_ar : course?.language_en) ||
    '';

  return pack.faq.map((item, index) => {
    if (index === 2) {
      const answer = language
        ? String(pack.languageAnswer || '').replace('{language}', language)
        : pack.languageFallback;
      return { question: item.question, answer };
    }
    if (index === 4) {
      const href = `/${lang}/course-inquiry?course=${encodeURIComponent(course?.slug || '')}`;
      const linkNote =
        lang === 'ar'
          ? ` (${pack.inquiryLinkLabel}: ${href})`
          : ` (${pack.inquiryLinkLabel}: ${href})`;
      return { question: item.question, answer: `${item.answer}${linkNote}` };
    }
    return { question: item.question, answer: item.answer };
  });
}

export function buildCourseJsonLd({ course, lang, dictionary, faqItems }) {
  const title = course?.title || '';
  const description = stripHtml(course?.subtitle || course?.description || '');
  const url = absoluteUrl(`/${lang}/courses/${course?.slug || ''}`);
  const image = course?.coverImage || course?.cover_image || absoluteUrl(seoConfig.ogImage);
  const price = Number(course?.price);
  const currency = course?.currency || 'USD';
  const language =
    course?.language ||
    (lang === 'ar' ? 'ar' : 'en');

  const nextStart =
    Array.isArray(course?.schedules) && course.schedules.length
      ? course.schedules
          .map((s) => s.startAt || s.start_at)
          .filter(Boolean)
          .sort()[0]
      : null;

  const courseLd = {
    '@type': 'Course',
    name: title,
    description,
    url,
    image,
    inLanguage: language,
    provider: {
      '@type': 'Organization',
      name: 'Creativity House',
      sameAs: seoConfig.siteUrl,
    },
  };

  if (Number.isFinite(price) && price > 0) {
    courseLd.offers = {
      '@type': 'Offer',
      price: String(price),
      priceCurrency: currency,
      url,
      availability: 'https://schema.org/InStock',
    };
  }

  if (nextStart) {
    courseLd.hasCourseInstance = {
      '@type': 'CourseInstance',
      courseMode: 'online',
      startDate: nextStart,
    };
  }

  const faqLd =
    faqItems?.length > 0
      ? {
          '@type': 'FAQPage',
          mainEntity: faqItems.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer,
            },
          })),
        }
      : null;

  const breadcrumbLd = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: dictionary?.catalog?.breadcrumbHome || (lang === 'ar' ? 'الرئيسية' : 'Home'),
        item: absoluteUrl(`/${lang}`),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: dictionary?.catalog?.breadcrumbCourses || (lang === 'ar' ? 'الدورات' : 'Courses'),
        item: absoluteUrl(`/${lang}/courses`),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: title,
        item: url,
      },
    ],
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [courseLd, breadcrumbLd, ...(faqLd ? [faqLd] : [])],
  };
}
