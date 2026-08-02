import { getDictionary } from '@/i18n/getDictionary';
import { seoConfig } from '@/config/seo';
import GlassAuthShell from '@/components/auth/GlassAuthShell';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const title =
    lang === 'ar' ? 'استعادة كلمة المرور | دار الإبداع' : 'Forgot Password | Creativity House';
  const description =
    lang === 'ar'
      ? 'أعد تعيين كلمة المرور باستخدام رمز التحقق المرسل إلى بريدك.'
      : 'Reset your password using the verification code sent to your email.';

  return {
    title,
    description,
    alternates: {
      canonical: `${seoConfig.siteUrl}/${lang}/forgot-password`,
      languages: {
        en: `${seoConfig.siteUrl}/en/forgot-password`,
        ar: `${seoConfig.siteUrl}/ar/forgot-password`,
      },
    },
  };
}

export default async function ForgotPasswordPage({ params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  const t = dictionary.auth;

  return (
    <GlassAuthShell
      lang={lang}
      dictionary={dictionary}
      title={t.forgotTitle}
      subtitle={t.forgotSubtitle}
      headerIcon="shield"
    >
      <ForgotPasswordForm dictionary={dictionary} lang={lang} />
    </GlassAuthShell>
  );
}
