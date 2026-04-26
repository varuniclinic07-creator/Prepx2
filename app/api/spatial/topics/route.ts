import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = createClient();
  const { data } = await supabase.from('topics').select('id, title, content').limit(20);
  return NextResponse.json({ topics: (data || []).map((t: any) => ({ id: t.id, title: t.title, content: t.content || {} })) });
}
