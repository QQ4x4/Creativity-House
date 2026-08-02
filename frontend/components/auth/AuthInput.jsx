'use client';

export default function AuthInput({
  id,
  label,
  error,
  type = 'text',
  maxLength = 50,
  autoComplete,
  dir,
  ...props
}) {
  return (
    <div className="w-full max-w-full space-y-1.5 text-start">
      <label htmlFor={id} className="block text-sm font-medium text-slate-200">
        {label}
      </label>
      <input
        id={id}
        type={type}
        maxLength={maxLength}
        autoComplete={autoComplete}
        dir={dir}
        className={`w-full max-w-full min-h-[44px] rounded-xl border bg-white/95 px-4 py-2.5 text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/30 dark:bg-slate-900/80 dark:text-white ${
          error
            ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30'
            : 'border-white/20 hover:border-plum-300/60'
        }`}
        {...props}
      />
      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
