'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  AsYouType,
} from 'libphonenumber-js';
import flags from 'react-phone-number-input/flags';
import enLabels from 'react-phone-number-input/locale/en.json';
import arLabels from 'react-phone-number-input/locale/ar.json';
import { ChevronDown, Phone, Search } from 'lucide-react';

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

  // Incomplete E.164 (e.g. "+9677") must not use /^\+\d+/ — that swallows the
  // national digits into the country-code match and wipes the input.
  try {
    const cc = getCountryCallingCode(fallbackCountry);
    const prefix = `+${cc}`;
    if (String(value).startsWith(prefix)) {
      return {
        country: fallbackCountry,
        national: String(value).slice(prefix.length),
      };
    }
  } catch {
    // ignore
  }

  return { country: fallbackCountry, national: String(value).replace(/^\+\d+\s*/, '') };
}

function CountryFlag({ code, labels, className = 'h-full w-full' }) {
  const Flag = flags[code];
  if (Flag) {
    return <Flag title={labels[code] || code} className={className} />;
  }
  return (
    <span className="flex h-full w-full items-center justify-center bg-white/10 text-[9px] text-gray-200">
      {code}
    </span>
  );
}

/**
 * Glass phone field with a custom country picker (no native OS select).
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
  variant = 'glass',
}) {
  const labels = lang === 'ar' ? arLabels : enLabels;
  const isPortal = variant === 'portal';
  const countries = useMemo(() => getCountries(), []);

  const initial = splitValue(value ?? '', defaultCountry);
  const [country, setCountry] = useState(initial.country || defaultCountry);
  const [national, setNational] = useState(initial.national);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  const rootRef = useRef(null);
  const searchRef = useRef(null);
  // Skip re-deriving national digits from our own onChange echo — that race
  // was dropping the first keystroke when the parent re-rendered with E.164.
  const lastEmittedRef = useRef(value ?? '');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const incoming = value ?? '';
    if (incoming === lastEmittedRef.current) {
      return;
    }
    lastEmittedRef.current = incoming;
    const next = splitValue(incoming, defaultCountry);
    setCountry(next.country || defaultCountry);
    setNational(next.national);
  }, [value, defaultCountry]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  const callingCode = getCountryCallingCode(country);

  const sortedCountries = useMemo(
    () =>
      [...countries].sort((a, b) =>
        (labels[a] || a).localeCompare(labels[b] || b)
      ),
    [countries, labels]
  );

  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedCountries;

    return sortedCountries.filter((code) => {
      const label = (labels[code] || code).toLowerCase();
      const dial = getCountryCallingCode(code);
      return (
        label.includes(q) ||
        code.toLowerCase().includes(q) ||
        dial.includes(q.replace(/^\+/, ''))
      );
    });
  }, [sortedCountries, query, labels]);

  const emit = (nextCountry, nextNational) => {
    const e164 = buildE164(nextCountry, nextNational);
    lastEmittedRef.current = e164;
    onChange?.(e164);
  };

  const selectCountry = (code) => {
    setCountry(code);
    emit(code, national);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="w-full max-w-full text-start" ref={rootRef}>
      <label
        htmlFor={id}
        className={`mb-1.5 ms-1 flex items-center gap-2 text-sm font-medium ${
          isPortal ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300'
        }`}
      >
        <Phone className="h-3.5 w-3.5 text-gold-400/80" aria-hidden />
        <span>{label}</span>
      </label>

      {/* Elevate the whole field when open so the menu stacks above sibling
          form controls (submit buttons) — z-index on the menu alone is not enough. */}
      <div className={`relative ${open ? 'z-50' : 'z-0'}`}>
        <div
          dir="ltr"
          className={`flex ${FIELD_H} w-full max-w-full items-stretch overflow-hidden rounded-2xl border transition-all duration-200 ${
            isPortal
              ? 'bg-gray-50 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 dark:bg-black/20 dark:focus-within:border-amber-400/60 dark:focus-within:ring-amber-400/20'
              : 'bg-white/[0.05] focus-within:border-amber-400/60 focus-within:ring-2 focus-within:ring-amber-400/20'
          } ${
            error
              ? 'border-red-400/70 focus-within:border-red-400 focus-within:ring-red-400/20'
              : isPortal
                ? 'border-gray-300 hover:border-gray-400 dark:border-white/10 dark:hover:border-white/20'
                : 'border-white/10 hover:border-white/20'
          } ${
            open
              ? isPortal
                ? 'border-purple-500 ring-2 ring-purple-500/15 dark:border-amber-400/40 dark:ring-amber-400/15'
                : 'border-amber-400/40 ring-2 ring-amber-400/15'
              : ''
          }`}
        >
          {/* Country trigger — custom dropdown (no native select) */}
          <button
            type="button"
            disabled={disabled}
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label="Country calling code"
            onClick={() => {
              if (disabled) return;
              setOpen((prev) => !prev);
              if (open) setQuery('');
            }}
            className={`relative flex shrink-0 items-center gap-2 border-e px-3.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/40 disabled:cursor-not-allowed disabled:opacity-60 ${
              isPortal
                ? 'border-gray-300 bg-gray-100 text-gray-800 hover:bg-gray-200 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200 dark:hover:bg-white/[0.06]'
                : 'border-white/10 bg-white/[0.04] text-gray-200 hover:bg-white/[0.06]'
            }`}
          >
            <span className="flex h-4 w-6 overflow-hidden rounded-[2px] ring-1 ring-white/25">
              <CountryFlag code={country} labels={labels} />
            </span>
            <span className="text-sm font-semibold tabular-nums text-gold-300">
              +{callingCode}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-gold-400 transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              }`}
              aria-hidden
            />
          </button>

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
            className={`min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed ${
              isPortal ? 'text-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500' : 'text-gray-100 placeholder:text-gray-500'
            }`}
          />
        </div>

        {/* Custom country list — client-only to avoid hydration mismatch */}
        {mounted && open ? (
          <div
            className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(100%,20rem)] overflow-hidden rounded-xl border border-white/15 bg-[#0b0612] text-gray-200 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85)] ring-1 ring-white/10 backdrop-blur-xl"
            role="presentation"
          >
            <div className="border-b border-white/10 bg-[#120a1c] px-3 py-2.5">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                  aria-hidden
                />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={lang === 'ar' ? 'ابحث عن دولة...' : 'Search country...'}
                  className="w-full rounded-lg border border-white/10 bg-[#181124] py-2 pe-3 ps-9 text-sm text-gray-200 placeholder:text-gray-500 outline-none transition-colors duration-200 focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/15"
                  aria-label={lang === 'ar' ? 'بحث الدولة' : 'Search country'}
                />
              </div>
            </div>

            <ul
              role="listbox"
              aria-label="Countries"
              className="glass-country-dropdown-scroll max-h-60 overflow-y-auto overscroll-contain py-1"
            >
              {filteredCountries.length === 0 ? (
                <li className="px-3 py-3 text-sm text-gray-400">
                  {lang === 'ar' ? 'لا توجد نتائج' : 'No countries found'}
                </li>
              ) : (
                filteredCountries.map((code) => {
                  const dial = getCountryCallingCode(code);
                  const isSelected = code === country;

                  return (
                    <li key={code} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        onClick={() => selectCountry(code)}
                        className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/40 ${
                          isSelected
                            ? 'bg-purple-500/20 text-gray-100'
                            : 'text-gray-200 hover:bg-white/10'
                        }`}
                      >
                        <span className="flex h-4 w-6 shrink-0 overflow-hidden rounded-[2px] ring-1 ring-white/20">
                          <CountryFlag code={code} labels={labels} />
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {labels[code] || code}
                        </span>
                        <span className="shrink-0 tabular-nums text-gray-400">
                          +{dial}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-1.5 ms-1 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
