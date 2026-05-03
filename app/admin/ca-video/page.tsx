// Admin CA Video Newspaper page — server component shell.
// Sprint 4-2.

import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import CaVideoTable from './TableClient';

export const dynamic = 'force-dynamic';

export default async function AdminCaVideoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div className="text-slate-400 p-8">Please log in as admin.</div>;

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return <div className="text-slate-400 p-8">Admin access required.</div>;

  const admin = getAdminClient();

  // Fetch videos + available published bundles for manual trigger.
  const [videosRes, bundlesRes] = await Promise.all([
    admin
      .from('ca_video_newspapers')
      .select('id, bundle_id, bundle_date, title, theme, duration_seconds, render_status, approval_status, generated_by, created_at')
      .order('bundle_date', { ascending: false })
      .limit(50),
    admin
      .from('ca_daily_bundles')
      .select('id, bundle_date, theme, status, article_count')
      .eq('status', 'published')
      .order('bundle_date', { ascending: false })
      .limit(30),
  ]);

  const videos = videosRes.data || [];
  const bundles = bundlesRes.data || [];

  return (
    <div className="p-6 text-slate-100">
      <h1 className="text-2xl font-bold mb-1">CA Video Newspapers</h1>
      <p className="text-slate-400 text-sm mb-6">
        Manage daily 5-8 minute current affairs video bulletins. Approve for users to view.
      </p>

      {/* Manual trigger section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-8">
        <h2 className="text-sm font-semibold mb-3">Generate from Bundle</h2>
        <CaVideoTable videos={videos} bundles={bundles} />
      </div>
    </div>
  );
}
