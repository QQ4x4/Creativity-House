'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getCountries } from 'libphonenumber-js';
import flags from 'react-phone-number-input/flags';
import enLabels from 'react-phone-number-input/locale/en.json';
import arLabels from 'react-phone-number-input/locale/ar.json';
import { Check, ChevronDown, Globe, Search } from 'lucide-react';

function CountryFlag({ code, labels, className = 'h-full w-full' }) {
  const Flag = flags[code];
  if (Flag) {
    return <Flag title={labels[code] || code} className={className} />;
  }
  return (
    <span className="flex h-full w-full items-center justify-center bg-white/10 text-[9px] text-gray-400 dark:text-gray-200">
      {code}
    </span>
  );
}

/**
 * Searchable glass country picker for checkout — no native OS <select>.
 * Value is an ISO 3166-1 alpha-2 code, same as the previous native select.
 */
export default function GlassCountrySelect({
  id = 'checkout-country',
  label,
  placeholder,
  error,
  value = '',
  onChange,
  onBlur,
  name,
  lang = 'en',
}) {
  const labels = lang === 'ar' ? arLabels : enLabels;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);

  const countries = useMemo(() => getCountries(), []);

  const sortedCountries = useMemo(
    () =>
      [...countries]
        .map((code) => ({ code, label: labels[code] || code }))
        .sort((a, b) => a.label.localeCompare(b.label, lang === 'ar' ? 'ar' : 'en')),
    [countries, labels, lang]
  );

  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedCountries;
    return sortedCountries.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.code.toLowerCase().includes(q)
    );
  }, [sortedCountries, query]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        setQuery('');
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, Math.max(filteredCountries.length - 1, 0)));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        return;
      }

      if (event.key === 'Enter' && filteredCountries[activeIndex]) {
        event.preventDefault();
        selectCountry(filteredCountries[activeIndex].code);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, filteredCountries, activeIndex]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      const target = event.target;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
      setQuery('');
      onBlur?.();
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, onBlur]);

  useEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuStyle(null);
      return undefined;
    }

    const update = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      const width = rect.width;
      const left = Math.min(rect.left, window.innerWidth - width - 8);
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left: Math.max(8, left),
        width,
        zIndex: 80,
      });
    };

    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open, menuStyle]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const active = listRef.current.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const selected = sortedCountries.find((item) => item.code === value) || null;

  const selectCountry = (code) => {
    onChange?.(code);
    setOpen(false);
    setQuery('');
    onBlur?.();
  };

  const searchPlaceholder = lang === 'ar' ? 'ابحث عن دولة...' : 'Search country...';
  const emptyLabel = lang === 'ar' ? 'لا توجد نتائج' : 'No countries found';

  return (
    <div className="w-full max-w-full text-start" ref={rootRef}>
      <label
        htmlFor={id}
        className="mb-1.5 ms-1 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        <Globe className="h-3.5 w-3.5 text-gold-400/80" aria-hidden />
        <span>{label}</span>
      </label>

      <div className="relative">
        <button
          type="button"
          id={id}
          ref={triggerRef}
          name={name}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={Boolean(error)}
          onClick={() => {
            setOpen((prev) => !prev);
            if (open) setQuery('');
          }}
          onBlur={() => {
            if (!open) onBlur?.();
          }}
          className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl border bg-white/80 px-4 text-start text-sm backdrop-blur-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/20 dark:bg-black/20 dark:focus-visible:ring-amber-400/40 ${
            error
              ? 'border-red-400/70'
              : open
                ? 'border-purple-500 ring-2 ring-purple-500/15 dark:border-amber-400/40 dark:ring-amber-400/15'
                : 'border-gray-300 hover:border-gray-400 dark:border-white/10 dark:hover:border-white/20'
          }`}
        >
          {selected ? (
            <>
              <span className="flex h-4 w-6 shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/10 dark:ring-white/25">
                <CountryFlag code={selected.code} labels={labels} />
              </span>
              <span className="min-w-0 flex-1 truncate text-gray-900 dark:text-white">{selected.label}</span>
            </>
          ) : (
            <span className="min-w-0 flex-1 truncate text-gray-400">{placeholder}</span>
          )}
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-gold-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>

        {mounted && open && menuStyle
          ? createPortal(
              <div
                ref={menuRef}
                style={menuStyle}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white/95 text-gray-900 shadow-[0_20px_50px_-20px_rgba(88,28,135,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-[#181124]/95 dark:text-gray-200 dark:shadow-xl dark:shadow-black/50"
                role="presentation"
              >
                <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 px-3 py-2.5 dark:border-white/10 dark:bg-[#120a1c]/80">
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                      aria-hidden
                    />
                    <input
                      ref={searchRef}
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={searchPlaceholder}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pe-3 ps-9 text-sm text-gray-900 placeholder:text-gray-500 outline-none transition-colors duration-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 dark:border-white/10 dark:bg-slate-900/80 dark:text-gray-200 dark:focus:border-amber-400/40 dark:focus:ring-amber-400/15"
                      aria-label={searchPlaceholder}
                    />
                  </div>
                </div>

                <ul
                  ref={listRef}
                  role="listbox"
                  aria-label={label}
                  className="glass-country-dropdown-scroll max-h-60 overflow-y-auto py-1"
                >
                  {filteredCountries.length === 0 ? (
                    <li className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</li>
                  ) : (
                    filteredCountries.map((item, index) => {
                      const isSelected = item.code === value;
                      const isActive = index === activeIndex;

                      return (
                        <li key={item.code} role="option" aria-selected={isSelected}>
                          <button
                            type="button"
                            data-active={isActive ? 'true' : undefined}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => selectCountry(item.code)}
                            className={`flex min-h-[44px] w-full items-center gap-3 px-3 text-start text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/40 ${
                              isSelected
                                ? 'bg-purple-50 text-gray-900 dark:bg-purple-500/20 dark:text-gray-100'
                                : isActive
                                  ? 'bg-gray-100 text-gray-900 dark:bg-purple-500/10 dark:text-gray-100'
                                  : 'text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-purple-500/10'
                            }`}
                          >
                            <span className="flex h-4 w-6 shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/10 dark:ring-white/20">
                              <CountryFlag code={item.code} labels={labels} />
                            </span>
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {isSelected ? (
                              <Check className="h-4 w-4 shrink-0 text-plum-700 dark:text-gold-300" aria-hidden />
                            ) : null}
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>,
              document.body
            )
          : null}
      </div>

      {error ? (
        <p className="mt-1.5 ms-1 text-sm text-red-600 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
