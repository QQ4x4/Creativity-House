import { getDictionary } from '@/i18n/getDictionary';
import { seoConfig } from '@/config/seo';
import SuccessStoriesClient from '@/components/success-stories/SuccessStoriesClient';
import JsonLd from '@/components/seo/JsonLd';
import { fetchSuccessStories } from '@/lib/catalog/successStories';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

function secondsToIso8601(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `PT${h}H${m}M${s}S`;
  if (m > 0) return `PT${m}M${s}S`;
  return `PT${s}S`;
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  let page = null;
  let featured = null;
  try {
    const data = await fetchSuccessStories({ lang });
    page = data.page;
    featured = data.featured;
  } catch {
    // fall back to locale defaults
  }

  const dictionary = await getDictionary(lang);
  const labels = dictionary.success_stories || {};

  const title =
    (lang === 'ar'
      ? page?.hero_title_ar || page?.hero_title_en
      : page?.hero_title_en || page?.hero_title_ar) ||
    labels.metaTitle ||
    (lang === 'ar' ? 'قصص النجاح | دار الإبداع' : 'Success Stories | Creativity House');

  const description =
    (lang === 'ar'
      ? page?.hero_subtitle_ar || page?.hero_subtitle_en
      : page?.hero_subtitle_en || page?.hero_subtitle_ar) ||
    labels.metaDescription ||
    (lang === 'ar'
      ? 'شاهد قصص نجاح طلاب دار الإبداع بعد برامج إدارة المشاريع المعتمدة.'
      : 'Watch real student success stories from Creativity House accredited project management programs.');

  const canonicalUrl = `${seoConfig.siteUrl}/${lang}/success-stories`;
  const ogImage = featured?.thumbnail_url || seoConfig.ogImage;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'x-default': `${seoConfig.siteUrl}/en/success-stories`,
        en: `${seoConfig.siteUrl}/en/success-stories`,
        ar: `${seoConfig.siteUrl}/ar/success-stories`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: seoConfig.siteName,
      locale: lang === 'ar' ? 'ar_SA' : 'en_US',
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function SuccessStoriesPage({ params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);

  let initialData = { page: null, featured: null, testimonials: [] };
  try {
    initialData = await fetchSuccessStories({ lang });
  } catch {
    // client will retry / show empty
  }

  const videoObjects = (initialData.testimonials || []).map((item) => ({
    '@type': 'VideoObject',
    name: item.person_name || item.video_title || 'Success story',
    description: item.quote || item.caption || item.person_role || '',
    thumbnailUrl: item.thumbnail_url ? [item.thumbnail_url] : undefined,
    uploadDate: item.created_at || undefined,
    duration: item.duration_seconds ? secondsToIso8601(item.duration_seconds) : undefined,
    embedUrl: item.embed_url || undefined,
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name:
          lang === 'ar'
            ? initialData.page?.hero_title_ar || 'قصص النجاح'
            : initialData.page?.hero_title_en || 'Success Stories',
        url: `${seoConfig.siteUrl}/${lang}/success-stories`,
        isPartOf: { '@type': 'WebSite', name: seoConfig.siteName, url: seoConfig.siteUrl },
      },
      ...videoObjects,
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <SuccessStoriesClient dictionary={dictionary} lang={lang} initialData={initialData} />
    </>
  );
}
