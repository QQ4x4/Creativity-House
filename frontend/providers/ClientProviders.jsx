'use client';

import { Suspense } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/providers/AuthProvider';
import AuthSuccessHandler from '@/providers/AuthSuccessHandler';

export default function ClientProviders({ children, lang }) {
  return (
    <AuthProvider lang={lang}>
      <Toaster
        position="top-center"
        richColors
        closeButton
        theme="dark"
        toastOptions={{
          className:
            '!rounded-2xl !border !border-white/15 !bg-[#0d0514]/90 !backdrop-blur-xl !text-white !shadow-2xl',
        }}
      />
      <Suspense fallback={null}>
        <AuthSuccessHandler />
      </Suspense>
      {children}
    </AuthProvider>
  );
}
