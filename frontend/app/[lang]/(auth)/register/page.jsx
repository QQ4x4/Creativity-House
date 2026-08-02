import { getDictionary } from '@/i18n/getDictionary';
import { seoConfig } from '@/config/seo';
import GlassAuthShell from '@/components/auth/GlassAuthShell';
import RegisterForm from '@/components/auth/RegisterForm';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const title =
    lang === 'ar'
      ? 'إنشاء حساب | دار الإبداع'
      : 'Create Account | Creativity House';
  const description =
    lang === 'ar'
      ? 'سجّل حسابًا جديدًا للوصول إلى الدورات والمحتوى الحصري.'
      : 'Create your account to access courses and exclusive content.';

  return {
    title,
    description,
    alternates: {
      canonical: `${seoConfig.siteUrl}/${lang}/register`,
      languages: {
        en: `${seoConfig.siteUrl}/en/register`,
        ar: `${seoConfig.siteUrl}/ar/register`,
      },
    },
  };
}

export default async function RegisterPage({ params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  const t = dictionary.auth;

  return (
    <GlassAuthShell
      lang={lang}
      dictionary={dictionary}
      title={t.registerTitle}
      subtitle={t.registerSubtitle}
    >
      <RegisterForm dictionary={dictionary} lang={lang} />
    </GlassAuthShell>
  );
}
