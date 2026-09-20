'use client';

import { useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Lock, Loader2 } from 'lucide-react';
import { toastApiError } from '@/lib/toast';

/**
 * Stripe Payment Element + confirmPayment for Scenario 3 checkout.
 * Billing details are collected in step 1 and passed here — Stripe's own
 * billing/country fields are hidden via PaymentElement options.
 */
export default function StripePaymentForm({
  labels,
  lang,
  paymentIntentId,
  billingDetails,
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
        returnUrl.searchParams.set('payment_intent', paymentIntentId);
        returnUrl.searchParams.set('session_id', paymentIntentId);
      }

      const countryCode = String(billingDetails?.countryCode || '')
        .trim()
        .toUpperCase();

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl.toString(),
          payment_method_data: {
            billing_details: {
              name: billingDetails?.name || undefined,
              email: billingDetails?.email || undefined,
              phone: billingDetails?.phone || undefined,
              address: countryCode
                ? {
                    country: countryCode,
                  }
                : undefined,
            },
          },
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
      const message = error?.message || labels.genericError;
      setLocalError(message);
      onError?.(message);
      toastApiError(error, labels.genericError);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        id="checkout-payment-element"
        options={{
          layout: 'tabs',
          fields: {
            billingDetails: 'never',
          },
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
