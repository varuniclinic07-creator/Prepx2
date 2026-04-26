'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Tenant { id: string; slug: string; name: string; primary_color: string; logo_url: string; ai_coach_name: string; status: string; setup_fee: number; monthly_fee: number; created_at: string; }

export default function TenantDetailPage() {
  const { slug } = useParams() as { slug: string };
  const [t, setT] = useState<Tenant | null>(null);
  const [users, setUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/white-label/tenants/${slug}`).then(r => r.json()).then(d => {
      setT(d.tenant || null); setUsers(d.users || 0); setLoading(false);
    });
  }, [slug]);

  if (loading) return <div className="text-slate-300">Loading…</div>;
  if (!t) return <div className="text-slate-400">Tenant not found</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">{t.name} <span className="text-sm font-normal text-slate-500">({t.slug})</span></h1>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-3 max-w-xl">
        <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Color</span><div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full border border-slate-700" style={{ backgroundColor: t.primary_color }} /><span className="text-sm font-mono text-slate-200">{t.primary_color}</span></div></div>
        <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Logo</span><span className="text-sm text-slate-200">{t.logo_url || '—'}</span></div>
        <div className="flex items-center justify-between"><span className="text-sm text-slate-400">AI Coach</span><span className="text-sm text-slate-200">{t.ai_coach_name}</span></div>
        <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Setup Fee</span><span className="text-sm text-slate-200">₹{t.setup_fee}</span></div>
        <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Monthly Fee</span><span className="text-sm text-slate-200">₹{t.monthly_fee}</span></div>
        <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Status</span><span className={`text-xs px-2 py-1 rounded ${t.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>{t.status}</span></div>
        <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Approx Users</span><span className="text-sm text-slate-200">{users}</span></div>
      </div>
    </div>
  );
}
