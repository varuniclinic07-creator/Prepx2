import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const card = cva(
  [
    'rounded-2xl border border-white/5 bg-[var(--color-surface-100)]/60',
    'shadow-[var(--shadow-md)] backdrop-blur-sm',
    'transition-[transform,border-color,box-shadow]',
    'duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
  ],
  {
    variants: {
      tone: {
        plain: '',
        primary: 'border-[var(--color-primary-500)]/20',
        success: 'border-[var(--color-success-500)]/25',
        warning: 'border-[var(--color-warning-500)]/25',
        error: 'border-[var(--color-error-500)]/25',
      },
      interactive: {
        true: 'hover:border-white/15 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]',
        false: '',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      tone: 'plain',
      interactive: false,
      padding: 'md',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof card> {}

export function Card({ className, tone, interactive, padding, ...rest }: CardProps) {
  return <div className={cn(card({ tone, interactive, padding }), className)} {...rest} />;
}

export function CardHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex items-start justify-between gap-3', className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-base font-semibold tracking-tight text-white', className)}
      {...rest}
    />
  );
}

export function CardSub({ className, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-1 text-xs text-white/50', className)} {...rest} />;
}
