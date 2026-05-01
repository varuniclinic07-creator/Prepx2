import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const pill = cva(
  [
    'inline-flex items-center gap-1.5 rounded-full',
    'px-3 py-1 text-[11px] font-semibold uppercase tracking-wider',
    'border backdrop-blur-sm',
  ],
  {
    variants: {
      tone: {
        primary: 'bg-[var(--color-primary-500)]/12 border-[var(--color-primary-500)]/30 text-[var(--color-primary-200)]',
        secondary:
          'bg-[var(--color-secondary-500)]/12 border-[var(--color-secondary-500)]/30 text-[var(--color-secondary-300)]',
        cyan: 'bg-[var(--color-accent-cyan-500)]/12 border-[var(--color-accent-cyan-500)]/30 text-[var(--color-accent-cyan-400)]',
        saffron:
          'bg-[var(--color-accent-saffron)]/15 border-[var(--color-accent-saffron)]/40 text-[var(--color-accent-saffron)]',
        success: 'bg-[var(--color-success-500)]/12 border-[var(--color-success-500)]/30 text-[var(--color-success-500)]',
        warning: 'bg-[var(--color-warning-500)]/12 border-[var(--color-warning-500)]/30 text-[var(--color-warning-500)]',
        error: 'bg-[var(--color-error-500)]/12 border-[var(--color-error-500)]/30 text-[var(--color-error-500)]',
        muted: 'bg-white/5 border-white/10 text-white/60',
      },
    },
    defaultVariants: {
      tone: 'muted',
    },
  }
);

export interface PillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pill> {}

export function Pill({ className, tone, ...rest }: PillProps) {
  return <span className={cn(pill({ tone }), className)} {...rest} />;
}
