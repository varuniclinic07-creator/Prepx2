'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Tenant { id: string; slug: string; name: string; primary_color: string; logo_url: string; ai_coach_name: string; status: string; setup_fee: number; monthly_fee: number; }

export default function WhiteLabelPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [form, setForm] = useState({ slug: '', name: '', primary_color: '#10b981', logo_url: '', ai_coach_name: 'PrepX Coach', setup_fee: 200000, monthly_fee: 50000 });

  useEffect(() => { loadTenants(); }, []);

  async function loadTenants() {
    const res = await fetch('/api/white-label/tenants');
    const d = await res.json();
    setTenants(d.tenants || []);
  }

  async function createTenant(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/white-label/tenants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setForm({ slug: '', name: '', primary_color: '#10b981', logo_url: '', ai_coach_name: 'PrepX Coach', setup_fee: 200000, monthly_fee: 50000 });
    loadTenants();
  }

  async function toggleStatus(id: string, status: string) {
    await fetch('/api/white-label/tenants', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    loadTenants();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">White-Label Tenants</h1>
      <form onSubmit={createTenant} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3 max-w-xl">
        <div className="grid grid-cols-2 gap-3">
          <input required value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="slug" className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100" />
          <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="name" className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100" />
          <input value={form.primary_color} onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))} placeholder="Color #10b981" className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100" />
          <input value={form.logo_url} onChange={e => setForm(p => ({ ...p, logo_url: e.target.value }))} placeholder="Logo URL" className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100" />
          <input value={form.ai_coach_name} onChange={e => setForm(p => ({ ...p, ai_coach_name: e.target.value }))} placeholder="AI Coach Name" className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100" />
          <input type="number" value={form.setup_fee} onChange={e => setForm(p => ({ ...p, setup_fee: Number(e.target.value) }))} placeholder="Setup Fee (paise)" className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100" />
          <input type="number" value={form.monthly_fee} onChange={e => setForm(p => ({ ...p, monthly_fee: Number(e.target.value) }))} placeholder="Monthly Fee (paise)" className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100" />
        </div>
        <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-600 transition">Create Tenant</button>
      </form>
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-slate-400 uppercase text-xs">
            <tr><th className="px-4 py-3 text-left">Slug</th><th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {tenants.map(t => (
              <tr key={t.id} className="hover:bg-slate-800/50">
                <td className="px-4 py-3 font-mono text-slate-300">{t.slug}</td>
                <td className="px-4 py-3 text-slate-200">{t.name}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded ${t.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>{t.status}</span></td>
                <td className="px-4 py-3 space-x-2">
                  <button onClick={() => toggleStatus(t.id, t.status === 'active' ? 'suspended' : 'active')} className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Toggle</button>
                  <Link href={`/admin/white-label/${t.slug}`} className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Details →</Link>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No tenants</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
