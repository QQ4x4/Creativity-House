'use client';

/**
 * Glass surface primitive for the Student Portal.
 * Single place that owns the panel recipe: #181124/90 + blur + purple border.
 */
export default function GlassPanel({
  as: Tag = 'div',
  padded = true,
  glow = false,
  className = '',
  children,
  ...props
}) {
  return (
    <Tag
      className={`relative rounded-3xl border border-gray-200 bg-white shadow-sm backdrop-blur-md transition-all duration-300 dark:border-purple-500/20 dark:bg-[#181124]/90 dark:shadow-none ${
        padded ? 'p-5 sm:p-6' : ''
      } ${glow ? 'hover:border-plum-300 hover:shadow-purple-900/10 dark:hover:border-purple-400/40 dark:hover:shadow-purple-900/30' : ''} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}
