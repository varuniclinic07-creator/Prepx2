import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Noto_Sans_Devanagari, Playfair_Display } from 'next/font/google';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase-server';
import { getServerLang } from '@/lib/i18n';
import { AppShell } from '@/components/AppShell';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const devanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  variable: '--font-noto-devanagari',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PrepX — Bharat ka apna AI UPSC mentor',
  description:
    'PrepX is a UPSC Corpus OS — a 24/7 AI research team (Hermes) builds adaptive lessons, real interview panels, and topic imagination videos every night, so aspirants outscore the cohort.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F172A',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Tenant primary colour is read once and applied as a CSS custom property.
  const h = await headers();
  const tenantSlug = h.get('x-tenant-slug');
  let primaryColor = 'var(--color-primary-500)';
  if (tenantSlug) {
    const supabase = await createClient();
    const { data: t } = await supabase
      .from('white_label_tenants')
      .select('primary_color')
      .eq('slug', tenantSlug)
      .single();
    if (t?.primary_color) primaryColor = t.primary_color as string;
  }

  const initialLang = await getServerLang();

  return (
    <html
      lang={initialLang}
      className={`${jakarta.variable} ${devanagari.variable} ${playfair.variable}`}
      suppressHydrationWarning
    >
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{--tenant-primary:${primaryColor};}`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <AppShell initialLang={initialLang}>{children}</AppShell>
      </body>
    </html>
  );
}
