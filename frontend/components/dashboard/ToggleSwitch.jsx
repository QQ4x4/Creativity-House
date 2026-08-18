'use client';

/**
 * Accessible notification toggle. Uses a real button with `role="switch"` so
 * keyboard users and screen readers get proper state, and keeps a 44px hit area.
 */
export default function ToggleSwitch({
  id,
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 transition-all duration-300 hover:border-plum-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-purple-400/30 dark:hover:bg-white/[0.05]">
      <div className="min-w-0 flex-1">
        <label
          htmlFor={id}
          className="block text-sm font-semibold text-gray-900 dark:text-gray-100"
        >
          {label}
        </label>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">{description}</p>
        ) : null}
      </div>

      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#181124] disabled:cursor-not-allowed disabled:opacity-50 ${
          checked
            ? 'border-gold-400/50 bg-gradient-to-r from-plum-600 to-gold-500 shadow-[0_0_14px_rgba(212,175,55,0.35)]'
            : 'border-gray-300 bg-gray-200 dark:border-white/15 dark:bg-white/10'
        }`}
      >
        <span
          aria-hidden
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
