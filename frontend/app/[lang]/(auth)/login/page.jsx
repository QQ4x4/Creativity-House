import { getDictionary } from '@/i18n/getDictionary';
import { seoConfig } from '@/config/seo';
import GlassAuthShell from '@/components/auth/GlassAuthShell';
import LoginForm from '@/components/auth/LoginForm';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const title = lang === 'ar' ? 'تسجيل الدخول | دار الإبداع' : 'Login | Creativity House';
  const description =
    lang === 'ar'
      ? 'سجّل الدخول للوصول إلى حسابك ودوراتك.'
      : 'Sign in to access your account and courses.';

  return {
    title,
    description,
    alternates: {
      canonical: `${seoConfig.siteUrl}/${lang}/login`,
      languages: {
        en: `${seoConfig.siteUrl}/en/login`,
        ar: `${seoConfig.siteUrl}/ar/login`,
      },
    },
  };
}

export default async function LoginPage({ params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  const t = dictionary.auth;

  return (
    <GlassAuthShell
      lang={lang}
      dictionary={dictionary}
      title={t.loginTitle}
      subtitle={t.loginSubtitle}
      compact
    >
      <LoginForm dictionary={dictionary} lang={lang} />
    </GlassAuthShell>
  );
}
