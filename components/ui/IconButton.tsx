'use client';

import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const iconButton = cva(
  [
    'inline-flex items-center justify-center rounded-full',
    'transition-[background-color,border-color,color,box-shadow,transform]',
    'duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-offset-[var(--color-surface-0)] focus-visible:ring-[var(--color-primary-400)]',
    'disabled:opacity-50 disabled:pointer-events-none',
  ],
  {
    variants: {
      variant: {
        glass: 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white',
        primary: 'bg-[var(--color-primary-500)] text-white hover:bg-[var(--color-primary-400)]',
        ghost: 'bg-transparent text-white/60 hover:bg-white/5 hover:text-white',
      },
      size: {
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'glass',
      size: 'md',
    },
  }
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButton> {
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, variant, size, label, type = 'button', children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(iconButton({ variant, size }), className)}
      {...rest}
    >
      {children}
    </button>
  );
});
