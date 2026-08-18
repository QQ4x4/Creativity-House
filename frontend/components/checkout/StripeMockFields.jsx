'use client';

import { useMemo } from 'react';
import { CreditCard } from 'lucide-react';

function detectBrand(digits) {
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard';
  return null;
}

function formatCardNumber(value) {
  const digits = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatExpiry(value) {
  const digits = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function BrandMark({ brand }) {
  if (brand === 'visa') {
    return (
      <span className="inline-flex h-6 min-w-[2.5rem] items-center justify-center rounded bg-[#1a1f71] px-1.5 text-[10px] font-extrabold tracking-wide text-white">
        VISA
      </span>
    );
  }

  if (brand === 'mastercard') {
    return (
      <span className="inline-flex items-center" aria-hidden>
        <span className="-me-1.5 h-4 w-4 rounded-full bg-[#eb001b]" />
        <span className="h-4 w-4 rounded-full bg-[#f79e1b]/90" />
      </span>
    );
  }

  return <CreditCard className="h-4 w-4 text-gray-400" aria-hidden />;
}

const fieldClass =
  'w-full min-h-[48px] rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-amber-400/60 dark:focus:ring-amber-400/20';

/** Visual Stripe Payment Element stand-in. Values never leave this component's parent as API payload. */
export default function StripeMockFields({ labels, values, errors, onChange }) {
  const digits = useMemo(
    () => String(values.cardNumber || '').replace(/\D/g, ''),
    [values.cardNumber]
  );
  const brand = detectBrand(digits);

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">{labels.cardDetails}</legend>

      <div>
        <label htmlFor="checkout-card-number" className="mb-1.5 ms-1 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {labels.cardNumber}
        </label>
        <div className="relative">
          <input
            id="checkout-card-number"
            name="cardNumber"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="ACCT-000015"
            value={values.cardNumber}
            onChange={(event) => onChange('cardNumber', formatCardNumber(event.target.value))}
            className={`${fieldClass} pe-20 ${errors.cardNumber ? 'border-red-400/70' : ''}`}
            maxLength={19}
          />
          <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center gap-1.5">
            {brand ? (
              <BrandMark brand={brand} />
            ) : (
              <>
                <BrandMark brand="visa" />
                <BrandMark brand="mastercard" />
              </>
            )}
          </span>
        </div>
        {errors.cardNumber ? (
          <p className="mt-1.5 ms-1 text-sm text-red-600 dark:text-red-300" role="alert">
            {errors.cardNumber}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="checkout-expiry" className="mb-1.5 ms-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {labels.expiry}
          </label>
          <input
            id="checkout-expiry"
            name="expiry"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/YY"
            value={values.expiry}
            onChange={(event) => onChange('expiry', formatExpiry(event.target.value))}
            className={`${fieldClass} ${errors.expiry ? 'border-red-400/70' : ''}`}
            maxLength={5}
          />
          {errors.expiry ? (
            <p className="mt-1.5 ms-1 text-sm text-red-600 dark:text-red-300" role="alert">
              {errors.expiry}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="checkout-cvc" className="mb-1.5 ms-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {labels.cvc}
          </label>
          <input
            id="checkout-cvc"
            name="cvc"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            value={values.cvc}
            onChange={(event) => onChange('cvc', event.target.value.replace(/\D/g, '').slice(0, 4))}
            className={`${fieldClass} ${errors.cvc ? 'border-red-400/70' : ''}`}
            maxLength={4}
          />
          {errors.cvc ? (
            <p className="mt-1.5 ms-1 text-sm text-red-600 dark:text-red-300" role="alert">
              {errors.cvc}
            </p>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">{labels.stripeMockHint}</p>
    </fieldset>
  );
}
