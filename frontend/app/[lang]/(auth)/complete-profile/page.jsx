import { getDictionary } from '@/i18n/getDictionary';
import { seoConfig } from '@/config/seo';
import GlassAuthShell from '@/components/auth/GlassAuthShell';
import CompleteProfileForm from '@/components/auth/CompleteProfileForm';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const title =
    lang === 'ar' ? 'إكمال الملف الشخصي | دار الإبداع' : 'Complete profile | Creativity House';
  const description =
    lang === 'ar'
      ? 'أضف رقم هاتفك لإكمال ملفك الشخصي.'
      : 'Add your phone number to complete your profile.';

  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: {
      canonical: `${seoConfig.siteUrl}/${lang}/complete-profile`,
      languages: {
        en: `${seoConfig.siteUrl}/en/complete-profile`,
        ar: `${seoConfig.siteUrl}/ar/complete-profile`,
      },
    },
  };
}

export default async function CompleteProfilePage({ params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  const t = dictionary.auth;

  return (
    <GlassAuthShell
      lang={lang}
      dictionary={dictionary}
      title={t.completeProfileTitle}
      subtitle={t.completeProfileSubtitle}
      compact
    >
      <CompleteProfileForm dictionary={dictionary} lang={lang} />
    </GlassAuthShell>
  );
}
