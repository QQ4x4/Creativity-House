'use client';

import { Suspense } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/providers/AuthProvider';
import AuthSuccessHandler from '@/providers/AuthSuccessHandler';
import CompleteProfileGate from '@/providers/CompleteProfileGate';

export default function ClientProviders({ children, lang }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="theme"
      disableTransitionOnChange
    >
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
        <CompleteProfileGate lang={lang}>{children}</CompleteProfileGate>
      </AuthProvider>
    </ThemeProvider>
  );
}
