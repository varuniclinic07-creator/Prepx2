import type { Metadata } from 'next';
import './globals.css';
import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'prepx — UPSC Corpus OS',
  description: 'AI-native Learning Operating System for UPSC CSE aspirants',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // P1.4: Unread notification count for aspirant header
  const { count: unreadCount } = user
    ? await supabase.from('user_notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)
    : { count: 0 };

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                prepx
              </Link>
              <span className="text-xs text-slate-400 uppercase tracking-wider hidden sm:inline">UPSC Corpus OS</span>
            </div>
            <nav className="flex items-center gap-3">
              {user ? (
                <>
                  {typeof unreadCount === 'number' && unreadCount > 0 && (
                    <Link href="/profile" className="relative text-sm text-amber-400 hover:text-amber-300 transition">
                      🔔
                      <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] px-1 rounded-full font-bold">{unreadCount}</span>
                    </Link>
                  )}
                  <Link href="/profile" className="text-sm text-slate-400 hover:text-slate-200 transition">Profile</Link>
                  <Link href="/interview" className="text-sm text-slate-400 hover:text-slate-200 transition">Interview</Link>
                  <form action="/logout" method="post">
                    <button type="submit" className="text-sm text-slate-400 hover:text-slate-200 transition">
                      Log Out
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="text-sm text-emerald-400 hover:text-emerald-300 transition">Log In</Link>
              )}
            </nav>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
