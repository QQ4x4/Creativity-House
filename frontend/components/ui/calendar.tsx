'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, type DayPickerProps } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type CalendarProps = DayPickerProps;

/**
 * shadcn-style calendar on react-day-picker v9, themed with plum/gold tokens.
 * Pass `dir` and a date-fns locale from the parent for RTL / Arabic.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col gap-4 sm:flex-row',
        month: 'space-y-3',
        month_caption: 'relative flex items-center justify-center pt-1',
        caption_label: 'text-sm font-semibold text-gray-900 dark:text-white',
        nav: 'flex items-center gap-1',
        button_previous: cn(
          buttonVariants({ variant: 'outline', size: 'icon' }),
          'absolute start-1 top-0 h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100'
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline', size: 'icon' }),
          'absolute end-1 top-0 h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100'
        ),
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex',
        weekday:
          'w-9 rounded-md text-[0.75rem] font-medium text-gray-500 dark:text-gray-400',
        week: 'mt-1 flex w-full',
        day: 'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100'
        ),
        selected:
          'bg-plum-600 text-white hover:bg-plum-600 hover:text-white focus:bg-plum-600 focus:text-white dark:bg-plum-500',
        today: 'bg-gold-100 text-plum-900 dark:bg-gold-500/20 dark:text-gold-200',
        outside: 'text-gray-400 opacity-50 dark:text-gray-600',
        disabled: 'text-gray-300 opacity-50 dark:text-gray-600',
        range_middle: 'aria-selected:bg-plum-100 aria-selected:text-plum-900 dark:aria-selected:bg-plum-500/20',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden />
          ),
      }}
      {...props}
    />
  );
}

Calendar.displayName = 'Calendar';

export { Calendar };
