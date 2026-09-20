'use client';

import { useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Lock, Loader2 } from 'lucide-react';
import { toastApiError } from '@/lib/toast';

const appearance = {
  theme: 'night',
  variables: {
    colorPrimary: '#a855f7',
    colorBackground: '#12091c',
    colorText: '#f8fafc',
    colorDanger: '#f87171',
    fontFamily: 'inherit',
    borderRadius: '12px',
  },
  rules: {
    '.Input': {
      backgroundColor: '#181124',
      border: '1px solid rgba(168, 85, 247, 0.25)',
    },
    '.Input:focus': {
      border: '1px solid rgba(212, 175, 55, 0.55)',
      boxShadow: '0 0 0 1px rgba(212, 175, 55, 0.25)',
    },
    '.Label': {
      color: '#e2e8f0',
    },
  },
};

export { appearance };

/**
 * Stripe Payment Element + confirmPayment for Scenario 3 checkout.
 */
export default function StripePaymentForm({
  labels,
  lang,
  paymentIntentId,
  onError,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elementReady, setElementReady] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || isSubmitting) return;

    setIsSubmitting(true);
    setLocalError('');

    try {
      const returnUrl = new URL(`/${lang}/checkout/claim`, window.location.origin);
      if (paymentIntentId) {
        // Prefer payment_intent (Stripe's own redirect param) + session_id for our claim page.
        returnUrl.searchParams.set('payment_intent', paymentIntentId);
        returnUrl.searchParams.set('session_id', paymentIntentId);
      }

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl.toString(),
        },
      });

      if (error) {
        const message = error.message || labels.genericError;
        setLocalError(message);
        onError?.(message);
        toastApiError(new Error(message), labels.genericError);
        setIsSubmitting(false);
      }
      // On success Stripe redirects away — keep button disabled.
    } catch (error) {
      setIsSubmitting(false);
      toastApiError(error, labels.genericError);
      onError?.(error?.message || labels.genericError);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        id="checkout-payment-element"
        options={{
          layout: 'tabs',
        }}
        onReady={() => setElementReady(true)}
      />

      {localError ? (
        <p className="text-sm text-red-600 dark:text-red-300" role="alert">
          {localError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!stripe || !elements || !elementReady || isSubmitting}
        className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-plum-700 via-plum-600 to-gold-500 px-6 text-base font-bold text-white shadow-[0_0_32px_rgba(168,85,247,0.35)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(212,175,55,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Lock className="h-4 w-4" aria-hidden />
        )}
        {isSubmitting ? labels.processing : labels.completePayment}
      </button>
    </form>
  );
}
