'use client';

import Link from 'next/link';
import { Coins, LogOut, User, Bell } from 'lucide-react';
import { LangToggle } from '@/components/ui/LangToggle';
import { IconButton } from '@/components/ui/IconButton';
import NotificationBell from '@/components/nav/NotificationBell';
import { cn } from '@/lib/cn';

/**
 * Authenticated app topbar. Slimmer than the marketing nav and pinned at the
 * top of the dashboard layout. Other batches will populate the avatar dropdown
 * + command palette.
 */
export function Topbar({
  coinBalance,
  tenantName,
  logoUrl,
  className,
}: {
  coinBalance: number;
  tenantName?: string | null;
  logoUrl?: string | null;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-white/5 bg-[var(--color-surface-0)]/80 backdrop-blur-xl',
        className
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- tenant URLs are arbitrary; next/image domain config is per-tenant
            <img src={logoUrl} alt={tenantName ?? 'PrepX'} className="h-7 w-auto rounded" />
          ) : (
            <>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--color-primary-500)] via-[var(--color-secondary-500)] to-[var(--color-accent-cyan-400)] shadow-[var(--shadow-glow-primary-sm)]">
                <span className="text-[11px] font-bold text-white">PX</span>
              </div>
              <span className="text-base font-bold tracking-tight text-white">
                Prep<span className="text-[var(--color-accent-saffron)]">X</span>
              </span>
            </>
          )}
        </Link>

        {tenantName && (
          <span className="hidden rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-white/55 sm:inline-flex">
            {tenantName}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            href="/shop"
            className="hidden items-center gap-1.5 rounded-full border border-[var(--color-accent-saffron)]/30 bg-[var(--color-accent-saffron)]/10 px-3 py-1.5 text-sm font-semibold text-[var(--color-accent-saffron)] hover:bg-[var(--color-accent-saffron)]/15 sm:inline-flex"
          >
            <Coins size={14} />
            <span>{coinBalance}</span>
          </Link>

          <NotificationBell />
          <LangToggle />

          <Link href="/profile">
            <IconButton variant="ghost" size="sm" label="Profile">
              <User size={16} />
            </IconButton>
          </Link>

          <form action="/logout" method="post">
            <IconButton variant="ghost" size="sm" label="Log out" type="submit">
              <LogOut size={16} />
            </IconButton>
          </form>
        </div>
      </div>
    </header>
  );
}

export { Bell };
