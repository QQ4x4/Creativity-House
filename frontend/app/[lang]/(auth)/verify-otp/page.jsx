import { Suspense } from 'react';
import { getDictionary } from '@/i18n/getDictionary';
import { seoConfig } from '@/config/seo';
import GlassAuthShell from '@/components/auth/GlassAuthShell';
import VerifyOtpForm from '@/components/auth/VerifyOtpForm';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const title =
    lang === 'ar' ? 'تأكيد البريد | دار الإبداع' : 'Verify Email | Creativity House';
  const description =
    lang === 'ar'
      ? 'أدخل رمز التحقق لإكمال إنشاء حسابك.'
      : 'Enter your verification code to activate your account.';

  return {
    title,
    description,
    alternates: {
      canonical: `${seoConfig.siteUrl}/${lang}/verify-otp`,
      languages: {
        en: `${seoConfig.siteUrl}/en/verify-otp`,
        ar: `${seoConfig.siteUrl}/ar/verify-otp`,
      },
    },
  };
}

export default async function VerifyOtpPage({ params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  const t = dictionary.auth;

  return (
    <GlassAuthShell
      lang={lang}
      dictionary={dictionary}
      title={t.otpTitle}
      subtitle={t.otpSubtitle}
      headerIcon="shield"
    >
      <Suspense
        fallback={
          <div className="min-h-[180px] animate-pulse rounded-2xl bg-white/[0.05]" />
        }
      >
        <VerifyOtpForm dictionary={dictionary} lang={lang} />
      </Suspense>
    </GlassAuthShell>
  );
}
