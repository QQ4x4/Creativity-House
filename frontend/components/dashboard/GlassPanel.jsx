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
      className={`relative rounded-3xl border border-purple-500/20 bg-[#181124]/90 shadow-2xl shadow-black/40 backdrop-blur-md transition-all duration-300 ${
        padded ? 'p-5 sm:p-6' : ''
      } ${glow ? 'hover:border-purple-400/40 hover:shadow-purple-900/30' : ''} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}
