'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Compass, BookOpen, Activity, BrainCircuit, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LangToggle } from '@/components/ui/LangToggle';
import { useT } from '@/lib/i18n-client';

/** Top nav for the public marketing landing. Pill-shaped, glassmorphic, fixed. */
export function MarketingNav() {
  const { t } = useT();

  return (
    <motion.nav
      initial={{ y: -32, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-0 right-0 top-0 z-50 flex justify-center px-3 pt-4 sm:pt-6"
    >
      <div className="flex w-full max-w-5xl items-center gap-3 sm:gap-6 backdrop-blur-2xl bg-black/40 border border-white/10 px-3 sm:px-6 py-2.5 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--color-primary-500)] via-[var(--color-secondary-500)] to-[var(--color-accent-cyan-400)] shadow-[var(--shadow-glow-primary-sm)] transition-shadow group-hover:shadow-[var(--shadow-glow-primary-md)]">
            <span className="text-sm font-bold tracking-tighter text-white">PX</span>
          </div>
          <span className="hidden text-base font-bold tracking-tight text-white sm:block">
            Prep<span className="text-[var(--color-accent-saffron)]">X</span>
          </span>
        </Link>

        <span className="hidden h-5 w-px bg-white/10 sm:block" aria-hidden />

        {/* Nav links — hidden on mobile, replaced by primary CTA */}
        <ul className="hidden items-center gap-5 md:flex">
          <NavItem icon={<Compass size={16} />} href="#features">Features</NavItem>
          <NavItem icon={<BookOpen size={16} />} href="#corpus">Corpus</NavItem>
          <NavItem icon={<Activity size={16} />} href="#dashboard">Dashboard</NavItem>
          <NavItem icon={<BrainCircuit size={16} />} href="#hermes" badge>Hermes AI</NavItem>
        </ul>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <LangToggle />
          <Link href="/login" className="hidden sm:block">
            <Button variant="ghost" size="sm">{t('nav.login')}</Button>
          </Link>
          <Link href="/signup">
            <Button variant="saffron" size="sm">{t('nav.signup')}</Button>
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

function NavItem({
  href,
  icon,
  badge,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  badge?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-2 text-sm font-medium text-white/55 transition-colors hover:text-white"
      >
        {icon}
        <span>{children}</span>
        {badge && (
          <span className="flex items-center gap-1 rounded-full border border-[var(--color-accent-cyan-500)]/30 bg-gradient-to-r from-[var(--color-primary-500)]/20 to-[var(--color-accent-cyan-500)]/20 px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--color-accent-cyan-400)]">
            <Sparkles size={10} /> AI
          </span>
        )}
      </Link>
    </li>
  );
}
