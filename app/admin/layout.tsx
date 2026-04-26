import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/');

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 space-y-2">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Admin Control</h2>
        <Link href="/admin/white-label" className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">White-Label</Link>
        <Link href="/admin" className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Dashboard</Link>
        <Link href="/admin/ai-providers" className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">AI Providers</Link>
        <Link href="/admin/content" className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Content</Link>
        <Link href="/admin/quizzes" className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Quizzes</Link>
        <Link href="/admin/hermes" className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Hermes</Link>
        <Link href="/admin/scraper" className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Scraper</Link>
        <Link href="/admin/bot" className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Bot</Link>
        <Link href="/admin/isa" className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">ISA</Link>
        <Link href="/admin/guides" className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Guides</Link>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
