import { getDictionary } from '@/i18n/getDictionary';
import { seoConfig } from '@/config/seo';
import AboutPageClient from '@/components/AboutPageClient';

/* ─── Static Params ─── */
export async function generateStaticParams() {
    return [{ lang: 'en' }, { lang: 'ar' }];
}

/* ─── SEO Metadata ─── */
export async function generateMetadata({ params }) {
    const { lang } = await params;

    const meta = {
        en: {
            title: 'About Us | Creativity House — Training & Consulting Experts',
            description:
                'Learn about Creativity House Sdn. Bhd. — a multinational training, consulting, and technology company founded in 2014. Meet our international trainer Eng. Talaat Al-Awadhi.',
        },
        ar: {
            title: 'من نحن | دار الإبداع — خبراء التدريب والاستشارات',
            description:
                'تعرف على دار الإبداع — شركة تدريب واستشارات وتقنية متعددة الجنسيات تأسست عام 2014. تعرف على مدربنا الدولي المهندس طلعت العوادي.',
        },
    };

    const pageMeta = meta[lang] ?? meta.en;
    const canonicalUrl = `${seoConfig.siteUrl}/${lang}/about`;
    const alternateLang = lang === 'en' ? 'ar' : 'en';

    return {
        title: pageMeta.title,
        description: pageMeta.description,
        alternates: {
            canonical: canonicalUrl,
            languages: {
                'x-default': `${seoConfig.siteUrl}/en/about`,
                en: `${seoConfig.siteUrl}/en/about`,
                ar: `${seoConfig.siteUrl}/ar/about`,
            },
        },
        openGraph: {
            title: pageMeta.title,
            description: pageMeta.description,
            url: canonicalUrl,
            siteName: seoConfig.siteName,
            locale: lang === 'ar' ? 'ar_SA' : 'en_US',
            type: 'website',
            images: [{ url: seoConfig.ogImage, width: 1200, height: 630, alt: seoConfig.siteName }],
        },
        twitter: {
            card: 'summary_large_image',
            title: pageMeta.title,
            description: pageMeta.description,
        },
    };
}

/* ─── Page Server Component ─── */
export default async function AboutPage({ params }) {
    const { lang } = await params;
    const dictionary = await getDictionary(lang);

    return <AboutPageClient dictionary={dictionary} lang={lang} />;
}
