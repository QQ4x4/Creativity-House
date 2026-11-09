'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, type DayPickerProps } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type CalendarProps = DayPickerProps;

/**
 * shadcn-style calendar on react-day-picker v9, themed with plum/gold tokens.
 * With captionLayout="dropdown": one header row ‹ [Month ▾] [Year ▾] › — no duplicate labels.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout,
  ...props
}: CalendarProps) {
  const usesDropdown =
    captionLayout === 'dropdown' ||
    captionLayout === 'dropdown-months' ||
    captionLayout === 'dropdown-years';

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      className={cn('p-3', className)}
      classNames={{
        months: 'relative flex flex-col gap-6 sm:flex-row sm:gap-4',
        month: 'relative space-y-3',
        month_caption: cn(
          'relative flex items-center justify-center gap-2 px-10 pt-1',
          usesDropdown && 'min-h-10'
        ),
        // Hide the text label when dropdowns are active (avoids Month shown twice).
        caption_label: usesDropdown
          ? 'sr-only'
          : 'text-sm font-semibold text-gray-900 dark:text-white',
        dropdowns: 'flex items-center justify-center gap-2',
        dropdown: 'relative inline-flex items-center',
        dropdown_root: 'relative inline-flex items-center',
        months_dropdown:
          'h-9 max-w-[9.5rem] cursor-pointer rounded-lg border border-gray-200 bg-white px-2 text-sm font-medium text-gray-900 dark:border-white/10 dark:bg-[#181124] dark:text-white',
        years_dropdown:
          'h-9 max-w-[5.5rem] cursor-pointer rounded-lg border border-gray-200 bg-white px-2 text-sm font-medium text-gray-900 dark:border-white/10 dark:bg-[#181124] dark:text-white',
        nav: 'pointer-events-none absolute inset-x-0 top-1 flex items-center justify-between',
        button_previous: cn(
          buttonVariants({ variant: 'outline', size: 'icon' }),
          'pointer-events-auto z-10 h-8 w-8 cursor-pointer bg-transparent p-0 opacity-70 hover:opacity-100'
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline', size: 'icon' }),
          'pointer-events-auto z-10 h-8 w-8 cursor-pointer bg-transparent p-0 opacity-70 hover:opacity-100'
        ),
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex',
        weekday:
          'w-9 rounded-md text-[0.75rem] font-medium text-gray-500 dark:text-gray-400',
        week: 'mt-1 flex w-full',
        day: 'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 cursor-pointer p-0 font-normal aria-selected:opacity-100'
        ),
        selected:
          'bg-plum-600 text-white hover:bg-plum-600 hover:text-white focus:bg-plum-600 focus:text-white dark:bg-plum-500',
        today: 'bg-gold-100 text-plum-900 dark:bg-gold-500/20 dark:text-gold-200',
        outside: 'text-gray-400 opacity-50 dark:text-gray-600',
        disabled: 'text-gray-300 opacity-50 dark:text-gray-600',
        range_middle:
          'aria-selected:bg-plum-100 aria-selected:text-plum-900 dark:aria-selected:bg-plum-500/20',
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
