'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[110px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm leading-relaxed text-gray-900 shadow-sm transition-colors duration-200 placeholder:text-gray-400 focus-visible:border-plum-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum-400/30 disabled:cursor-not-allowed disabled:opacity-50',
          'dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus-visible:border-gold-400/40 dark:focus-visible:ring-amber-400/30',
          'aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus-visible:ring-red-400/30',
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
