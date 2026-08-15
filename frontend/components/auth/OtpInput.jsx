'use client';

import { useEffect, useRef } from 'react';

/**
 * OTP pin inputs — glass styling (used only by verify-otp flow).
 */
export default function OtpInput({ value, onChange, disabled = false, error }) {
  const inputsRef = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const commit = (nextDigits) => {
    onChange(nextDigits.join('').slice(0, 6));
  };

  const handleChange = (index, raw) => {
    const cleaned = raw.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      commit(next);
      return;
    }

    const chars = cleaned.split('').slice(0, 6 - index);
    const next = [...digits];
    chars.forEach((char, offset) => {
      next[index + offset] = char;
    });
    commit(next);

    const focusIndex = Math.min(index + chars.length, 5);
    inputsRef.current[focusIndex]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = Array.from({ length: 6 }, (_, i) => pasted[i] || '');
    commit(next);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="w-full max-w-full space-y-2">
      <div
        className="flex w-full max-w-full justify-between gap-2 sm:gap-3"
        dir="ltr"
        onPaste={handlePaste}
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            disabled={disabled}
            value={digit}
            dir="ltr"
            aria-label={`Digit ${index + 1}`}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className={`h-[52px] min-h-[52px] w-full max-w-[56px] rounded-2xl border bg-white/[0.05] p-0 text-center !text-center text-xl font-semibold leading-[52px] tabular-nums text-white outline-none transition-all duration-200 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 ${
              error ? 'border-red-400/70' : 'border-white/10 hover:border-white/20'
            }`}
          />
        ))}
      </div>
      {error ? (
        <p className="text-start text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
