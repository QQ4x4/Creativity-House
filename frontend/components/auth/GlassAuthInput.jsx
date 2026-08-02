'use client';

import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Glassmorphism auth input — Register/OTP only.
 * Login continues to use AuthInput (untouched).
 */
const GlassAuthInput = forwardRef(function GlassAuthInput(
  {
    id,
    label,
    error,
    type = 'text',
    maxLength = 50,
    autoComplete,
    dir,
    icon: Icon,
    showPasswordToggle = false,
    className = '',
    ...props
  },
  ref
) {
  const [revealed, setRevealed] = useState(false);
  const inputType = showPasswordToggle ? (revealed ? 'text' : 'password') : type;

  return (
    <div className={`w-full max-w-full text-start ${className}`}>
      <label
        htmlFor={id}
        className="mb-1.5 ms-1 flex items-center gap-2 text-sm font-medium text-gray-300"
      >
        {Icon ? <Icon className="h-3.5 w-3.5 text-gold-400/80" aria-hidden /> : null}
        <span>{label}</span>
      </label>

      <div className="relative">
        {Icon ? (
          <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 text-gray-400">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        ) : null}

        <input
          ref={ref}
          id={id}
          type={inputType}
          maxLength={maxLength}
          autoComplete={autoComplete}
          dir={dir}
          className={`w-full max-w-full min-h-[48px] rounded-2xl border bg-white/[0.05] py-3.5 text-white outline-none transition-all duration-200 placeholder:text-gray-500 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 ${
            Icon ? 'ps-11' : 'ps-4'
          } ${showPasswordToggle ? 'pe-11' : 'pe-4'} ${
            error
              ? 'border-red-400/70 focus:border-red-400 focus:ring-red-400/20'
              : 'border-white/10 hover:border-white/20'
          }`}
          {...props}
        />

        {showPasswordToggle ? (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="absolute inset-y-0 end-0 flex min-w-[44px] items-center justify-center pe-3 text-gray-400 transition-colors duration-200 hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
            aria-label={revealed ? 'Hide password' : 'Show password'}
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-1.5 ms-1 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});

export default GlassAuthInput;
