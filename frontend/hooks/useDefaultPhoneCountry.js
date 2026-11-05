'use client';

import { useEffect, useState } from 'react';
import { getCountries } from 'libphonenumber-js';

const FALLBACK_COUNTRY = 'YE';
const CACHE_KEY = 'ch_default_phone_country';
const GEO_URL = 'https://ipapi.co/json/';
const GEO_TIMEOUT_MS = 4000;

const VALID_COUNTRIES = new Set(getCountries());

function readCachedCountry() {
  if (typeof window === 'undefined') return null;
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached && VALID_COUNTRIES.has(cached)) return cached;
  } catch {
    // private mode / blocked storage
  }
  return null;
}

function writeCachedCountry(code) {
  try {
    sessionStorage.setItem(CACHE_KEY, code);
  } catch {
    // ignore
  }
}

function normalizeCountryCode(raw) {
  const code = String(raw || '')
    .trim()
    .toUpperCase();
  if (code.length === 2 && VALID_COUNTRIES.has(code)) return code;
  return null;
}

/**
 * Resolves a phone-input default country from IP geolocation.
 * Always returns `fallback` on the first render (SSR + hydration), then updates
 * after mount from session cache / geo. Falls back to YE on failure.
 */
export function useDefaultPhoneCountry(fallback = FALLBACK_COUNTRY) {
  const safeFallback = normalizeCountryCode(fallback) || FALLBACK_COUNTRY;
  // Fixed default on first paint — never read cache/window here (hydration-safe).
  const [country, setCountry] = useState(safeFallback);

  useEffect(() => {
    const cached = readCachedCountry();
    if (cached) {
      setCountry(cached);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(GEO_URL, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error(`geo ${response.status}`);
        const data = await response.json();
        const detected = normalizeCountryCode(data.country_code || data.country);
        if (!cancelled && detected) {
          writeCachedCountry(detected);
          setCountry(detected);
        }
      } catch {
        // Keep fallback (YE or prop) — ad-blockers / network / timeout.
      } finally {
        clearTimeout(timer);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  return country;
}

export default useDefaultPhoneCountry;
