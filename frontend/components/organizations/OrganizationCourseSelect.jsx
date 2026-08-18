'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Check, ChevronDown, Loader2 } from 'lucide-react';

export default function OrganizationCourseSelect({
  id = 'org-course',
  label,
  optionalLabel,
  placeholder,
  loadingLabel,
  noneLabel,
  error,
  value = '',
  onChange,
  onBlur,
  name,
  courses = [],
  isLoading = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const listRef = useRef(null);

  const options = useMemo(
    () => [
      { id: '', title: noneLabel },
      ...courses
        .filter((course) => course?.id != null && course.id !== '')
        .map((course) => ({
          id: String(course.id),
          title: course.title || course.title_en || `#${course.id}`,
        })),
    ],
    [courses, noneLabel]
  );

  const selected = options.find((item) => item.id === String(value ?? '')) || null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (
        rootRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return;
      }
      setOpen(false);
      onBlur?.();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, options.length - 1));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
      }
      if (event.key === 'Enter' && options[activeIndex]) {
        event.preventDefault();
        onChange?.(options[activeIndex].id);
        setOpen(false);
        onBlur?.();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, options, activeIndex, onBlur, onChange]);

  useEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }

    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
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
    if (!open || !listRef.current) return;
    const active = listRef.current.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const triggerLabel = isLoading
    ? loadingLabel
    : selected?.id
      ? selected.title
      : placeholder;

  return (
    <div className="w-full max-w-full text-start" ref={rootRef}>
      <label
        htmlFor={id}
        className="mb-1.5 ms-1 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        <BookOpen className="h-3.5 w-3.5 text-gold-400/80" aria-hidden />
        <span>{label}</span>
        {optionalLabel ? (
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
            ({optionalLabel})
          </span>
        ) : null}
      </label>

      <div className="relative">
        <button
          type="button"
          id={id}
          ref={triggerRef}
          name={name}
          disabled={disabled || isLoading}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={Boolean(error)}
          aria-busy={isLoading}
          onClick={() => {
            if (disabled || isLoading) return;
            setOpen((prev) => !prev);
          }}
          onBlur={() => {
            if (!open) onBlur?.();
          }}
          className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl border bg-white/80 px-4 text-start text-sm backdrop-blur-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/20 disabled:cursor-wait disabled:opacity-80 dark:bg-black/20 dark:focus-visible:ring-amber-400/40 ${
            error
              ? 'border-red-400/70'
              : open
                ? 'border-purple-500 ring-2 ring-purple-500/15 dark:border-amber-400/40 dark:ring-amber-400/15'
                : 'border-gray-300 hover:border-gray-400 dark:border-white/10 dark:hover:border-white/20'
          }`}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gold-400" aria-hidden />
          ) : null}
          <span
            className={`min-w-0 flex-1 truncate ${
              selected?.id && !isLoading
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-400'
            }`}
          >
            {triggerLabel}
          </span>
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
                <ul
                  ref={listRef}
                  role="listbox"
                  aria-label={label}
                  className="glass-country-dropdown-scroll max-h-60 overflow-y-auto py-1"
                >
                  {options.map((item, index) => {
                    const isSelected = item.id === String(value ?? '');
                    const isActive = index === activeIndex;

                    return (
                      <li key={item.id || 'none'} role="option" aria-selected={isSelected}>
                        <button
                          type="button"
                          data-active={isActive ? 'true' : undefined}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => {
                            onChange?.(item.id);
                            setOpen(false);
                            onBlur?.();
                          }}
                          className={`flex min-h-[44px] w-full items-center gap-3 px-3 text-start text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/40 ${
                            isSelected
                              ? 'bg-purple-50 text-gray-900 dark:bg-purple-500/20 dark:text-gray-100'
                              : isActive
                                ? 'bg-gray-100 text-gray-900 dark:bg-purple-500/10 dark:text-gray-100'
                                : 'text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-purple-500/10'
                          }`}
                        >
                          <span className="min-w-0 flex-1 truncate">{item.title}</span>
                          {isSelected ? (
                            <Check className="h-4 w-4 shrink-0 text-plum-700 dark:text-gold-300" aria-hidden />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
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
