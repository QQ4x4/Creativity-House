'use client';

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

/**
 * Invisible reCAPTCHA v3 for login/register. Skips the provider when the site
 * key is unset so local WAMP can still submit without Google scripts.
 */
export default function AuthRecaptchaProvider({ children }) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

  if (!siteKey) {
    return children;
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={siteKey}
      scriptProps={{
        async: true,
        defer: true,
        appendTo: 'head',
      }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}
