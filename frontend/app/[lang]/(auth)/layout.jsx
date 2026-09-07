import AuthRecaptchaProvider from '@/providers/AuthRecaptchaProvider';

export default function AuthLayout({ children }) {
  return <AuthRecaptchaProvider>{children}</AuthRecaptchaProvider>;
}
