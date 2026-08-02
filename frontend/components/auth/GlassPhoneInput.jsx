'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  AsYouType,
} from 'libphonenumber-js';
import flags from 'react-phone-number-input/flags';
import enLabels from 'react-phone-number-input/locale/en.json';
import arLabels from 'react-phone-number-input/locale/ar.json';
import { ChevronDown, Phone } from 'lucide-react';

const FIELD_H = 'h-[52px]';

function buildE164(country, nationalDigits) {
  const digits = String(nationalDigits || '').replace(/\D/g, '');
  if (!digits) return '';
  try {
    const typed = new AsYouType(country);
    typed.input(digits);
    const parsed = typed.getNumber();
    if (parsed) return parsed.number;
    return `+${getCountryCallingCode(country)}${digits}`;
  } catch {
    return `+${getCountryCallingCode(country)}${digits}`;
  }
}

function splitValue(value, fallbackCountry) {
  if (!value) {
    return { country: fallbackCountry, national: '' };
  }
  try {
    const parsed = parsePhoneNumberFromString(value);
    if (parsed) {
      return {
        country: parsed.country || fallbackCountry,
        national: parsed.nationalNumber || '',
      };
    }
  } catch {
    // ignore
  }
  return { country: fallbackCountry, national: String(value).replace(/^\+\d+\s*/, '') };
}

/**
 * Visible country flag + dial-code selector on the start/left of the field.
 */
export default function GlassPhoneInput({
  id = 'phone_number',
  label,
  error,
  value,
  onChange,
  onBlur,
  name,
  defaultCountry = 'YE',
  disabled = false,
  lang = 'en',
}) {
  const labels = lang === 'ar' ? arLabels : enLabels;
  const countries = useMemo(() => getCountries(), []);

  const initial = splitValue(value, defaultCountry);
  const [country, setCountry] = useState(initial.country || defaultCountry);
  const [national, setNational] = useState(initial.national);

  useEffect(() => {
    const next = splitValue(value, defaultCountry);
    setCountry(next.country || defaultCountry);
    setNational(next.national);
  }, [value, defaultCountry]);

  const callingCode = getCountryCallingCode(country);
  const Flag = flags[country];

  const sortedCountries = useMemo(
    () =>
      [...countries].sort((a, b) =>
        (labels[a] || a).localeCompare(labels[b] || b)
      ),
    [countries, labels]
  );

  const emit = (nextCountry, nextNational) => {
    onChange?.(buildE164(nextCountry, nextNational));
  };

  return (
    <div className="w-full max-w-full text-start">
      <label
        htmlFor={id}
        className="mb-1.5 ms-1 flex items-center gap-2 text-sm font-medium text-gray-300"
      >
        <Phone className="h-3.5 w-3.5 text-gold-400/80" aria-hidden />
        <span>{label}</span>
      </label>

      <div
        dir="ltr"
        className={`relative flex ${FIELD_H} w-full max-w-full items-stretch overflow-hidden rounded-2xl border bg-white/[0.05] transition-all duration-200 focus-within:border-amber-400/60 focus-within:ring-2 focus-within:ring-amber-400/20 ${
          error
            ? 'border-red-400/70 focus-within:border-red-400 focus-within:ring-red-400/20'
            : 'border-white/10 hover:border-white/20'
        }`}
      >
        {/* Visible country chip */}
        <div className="relative flex shrink-0 items-center gap-2 border-e border-white/10 bg-white/[0.04] px-3.5">
          <span className="pointer-events-none flex h-4 w-6 overflow-hidden rounded-[2px] ring-1 ring-white/25">
            {Flag ? (
              <Flag title={labels[country] || country} className="h-full w-full" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-white/10 text-[9px] text-white">
                {country}
              </span>
            )}
          </span>
          <span className="pointer-events-none text-sm font-semibold tabular-nums text-gold-300">
            +{callingCode}
          </span>
          <ChevronDown
            className="pointer-events-none h-3.5 w-3.5 text-gold-400"
            aria-hidden
          />

          <select
            value={country}
            disabled={disabled}
            onChange={(e) => {
              const next = e.target.value;
              setCountry(next);
              emit(next, national);
            }}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            aria-label="Country calling code"
          >
            {sortedCountries.map((code) => (
              <option key={code} value={code}>
                {labels[code] || code} (+{getCountryCallingCode(code)})
              </option>
            ))}
          </select>
        </div>

        <input
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          disabled={disabled}
          value={national}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d\s\-()]/g, '');
            setNational(digits);
            emit(country, digits);
          }}
          onBlur={onBlur}
          maxLength={20}
          placeholder="7XX XXX XXX"
          className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-gray-500 disabled:cursor-not-allowed"
        />
      </div>

      {error ? (
        <p className="mt-1.5 ms-1 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
