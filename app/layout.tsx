import type { Metadata } from 'next';
import './globals.css';
import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import NotificationBell from '@/components/nav/NotificationBell';
import { headers } from 'next/headers';

export const metadata: Metadata = {
  title: 'prepx — UPSC Corpus OS',
  description: 'AI-native Learning Operating System for UPSC CSE aspirants',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const unreadCount = user
    ? (await supabase.from('user_notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)).count ?? 0
    : 0;

  const { data: balanceRow } = user
    ? await supabase.from('user_balances').select('coins').eq('user_id', user.id).single()
    : { data: null };
  const coinBalance = balanceRow?.coins ?? 0;

  // F3: Tenant branding from middleware header
  const h = await headers();
  const tenantSlug = h.get('x-tenant-slug');
  let tenant = null;
  if (tenantSlug) {
    const { data: t } = await supabase.from('white_label_tenants').select('*').eq('slug', tenantSlug).single();
    tenant = t;
  }
  const primaryColor = tenant?.primary_color || '#10b981';
  const logoUrl = tenant?.logo_url || null;
  const coachName = tenant?.ai_coach_name || 'PrepX Coach';

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <style>{`:root { --tenant-primary: ${primaryColor}; }`}</style>
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt={tenant?.name || 'PrepX'} className="h-6 w-auto rounded" />
              ) : (
                <Link href="/" className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  prepx
                </Link>
              )}
              <span className="text-xs text-slate-400 uppercase tracking-wider hidden sm:inline">{tenant?.name || 'UPSC Corpus OS'}</span>
            </div>
            <nav className="flex items-center gap-3">
              {user ? (
                <>
                  <Link href="/shop" className="flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300 transition">
                    🪙 <span className="font-bold">{coinBalance}</span>
                  </Link>
                  <NotificationBell />
                  <Link href="/profile" className="text-sm text-slate-400 hover:text-slate-200 transition">Profile</Link>
                  <Link href="/rank" className="text-sm text-slate-400 hover:text-slate-200 transition">Rank</Link>
                  <Link href="/mnemonics" className="text-sm text-slate-400 hover:text-slate-200 transition">Mnemonics</Link>
                  <Link href="/dhwani" className="text-sm text-slate-400 hover:text-slate-200 transition">Dhwani</Link>
                  <Link href="/astra" className="text-sm text-slate-400 hover:text-slate-200 transition">Astra</Link>
                  <Link href="/battle-royale" className="text-sm text-slate-400 hover:text-slate-200 transition">Royale</Link>
                  <Link href="/voice" className="text-sm text-slate-400 hover:text-slate-200 transition">Voice</Link>
                  <Link href="/interview" className="text-sm text-slate-400 hover:text-slate-200 transition">Interview</Link>
                  <Link href="/essay-colosseum" className="text-sm text-slate-400 hover:text-slate-200 transition">Colosseum</Link>
                  <Link href="/ranks" className="text-sm text-slate-400 hover:text-slate-200 transition">Ranks</Link>
                  <Link href="/territory" className="text-sm text-slate-400 hover:text-slate-200 transition">Territory</Link>
                  <Link href="/tutors" className="text-sm text-slate-400 hover:text-slate-200 transition">Tutors</Link>
                  <Link href="/spatial" className="text-sm text-slate-400 hover:text-slate-200 hidden md:inline transition">Spatial</Link>
                  <form action="/logout" method="post">
                    <button type="submit" className="text-sm text-slate-400 hover:text-slate-200 transition">Log Out</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="text-sm text-emerald-400 hover:text-emerald-300 transition">Log In</Link>
              )}
            </nav>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
        {/* F3: AI Coach name in footer or injected greeting */}
        {tenant && (
          <div className="fixed bottom-4 right-4 z-40 bg-slate-900/90 border border-slate-800 rounded-full px-3 py-1.5 text-xs text-slate-400">
            {coachName} via {tenant.name}
          </div>
        )}
      </body>
    </html>
  );
}
