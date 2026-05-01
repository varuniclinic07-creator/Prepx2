'use client';

import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const button = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'font-semibold tracking-tight whitespace-nowrap',
    'rounded-full select-none',
    'transition-[transform,box-shadow,background-color,border-color,color]',
    'duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
    'disabled:opacity-50 disabled:pointer-events-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-offset-[var(--color-surface-0)] focus-visible:ring-[var(--color-primary-400)]',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-secondary-500)]',
          'text-white shadow-[var(--shadow-glow-primary-md)]',
          'hover:shadow-[var(--shadow-glow-primary-lg)] hover:-translate-y-0.5',
        ],
        saffron: [
          'bg-gradient-to-r from-[var(--color-accent-saffron)] to-[var(--color-accent-saffron-deep)]',
          'text-[var(--color-surface-0)] shadow-[var(--shadow-glow-saffron-sm)]',
          'hover:shadow-[var(--shadow-glow-saffron-md)] hover:-translate-y-0.5',
        ],
        ghost: [
          'bg-white/5 border border-white/10 text-white/90',
          'hover:bg-white/10 hover:border-white/20',
        ],
        outline: [
          'bg-transparent border border-white/15 text-white/85',
          'hover:bg-white/5 hover:border-white/30',
        ],
        link: [
          'bg-transparent text-[var(--color-primary-300)] underline-offset-4',
          'hover:underline hover:text-[var(--color-primary-200)] px-0',
        ],
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-6 text-[15px]',
        lg: 'h-14 px-8 text-base',
        icon: 'h-10 w-10 p-0',
      },
      block: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      block: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, type = 'button', ...rest },
  ref
) {
  return (
    <button ref={ref} type={type} className={cn(button({ variant, size, block }), className)} {...rest} />
  );
});

export const buttonStyles = button;
