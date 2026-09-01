'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-plum-700 to-plum-500 text-white shadow-[0_0_24px_rgba(168,85,247,0.25)] hover:from-plum-600 hover:to-plum-400',
        secondary:
          'border border-gray-300/80 bg-white/40 text-gray-700 backdrop-blur-md hover:border-plum-400/50 hover:bg-white/70 hover:text-plum-800 dark:border-white/15 dark:bg-white/5 dark:text-gray-200 dark:hover:border-gold-400/40 dark:hover:bg-white/10 dark:hover:text-gold-200',
        outline:
          'border border-gray-200 bg-transparent text-gray-700 hover:border-plum-300 hover:text-gray-900 dark:border-white/10 dark:text-gray-300 dark:hover:border-purple-400/40 dark:hover:text-white',
        ghost:
          'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white',
        destructive:
          'border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20',
        link: 'text-plum-700 underline-offset-4 hover:underline dark:text-gold-300',
      },
      size: {
        default: 'min-h-[44px] px-4 py-2',
        sm: 'min-h-[36px] rounded-lg px-3 text-xs',
        lg: 'min-h-[48px] px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
