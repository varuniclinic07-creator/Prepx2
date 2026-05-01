'use client';

import { Toaster } from 'sonner';
import { LangProvider } from '@/lib/i18n-client';
import type { Lang } from '@/lib/i18n';
import { PageTransition } from '@/components/PageTransition';

/**
 * Client boundary for app-wide providers: i18n, page transitions, toast.
 * Topbar/MarketingNav are rendered per-route to keep the global shell thin.
 */
export function AppShell({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  return (
    <LangProvider initialLang={initialLang}>
      <PageTransition>{children}</PageTransition>
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            color: '#cbd5e1',
            backdropFilter: 'blur(12px)',
          },
        }}
      />
    </LangProvider>
  );
}
