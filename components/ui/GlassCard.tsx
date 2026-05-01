import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const glassCard = cva(
  [
    'relative overflow-hidden rounded-2xl glass',
    'transition-[transform,border-color,box-shadow]',
    'duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
  ],
  {
    variants: {
      glow: {
        none: '',
        primary: 'shadow-[var(--shadow-md),var(--shadow-glow-primary-sm)]',
        secondary: 'shadow-[var(--shadow-md),0_0_24px_rgba(139,92,246,0.25)]',
        cyan: 'shadow-[var(--shadow-md),var(--shadow-glow-cyan-md)]',
        saffron: 'shadow-[var(--shadow-md),var(--shadow-glow-saffron-sm)]',
      },
      interactive: {
        true: 'hover:-translate-y-0.5 hover:border-white/20',
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
      glow: 'none',
      interactive: false,
      padding: 'md',
    },
  }
);

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCard> {}

export function GlassCard({ className, glow, interactive, padding, children, ...rest }: GlassCardProps) {
  return (
    <div className={cn(glassCard({ glow, interactive, padding }), className)} {...rest}>
      {children}
    </div>
  );
}
