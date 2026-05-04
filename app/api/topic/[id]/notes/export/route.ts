// /api/topic/[id]/notes/export — download user's notes for a topic as PDF.

import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { buildNotesPdf } from '@/lib/pdf/notes-export';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: topicId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const [{ data: topic }, { data: notes }] = await Promise.all([
    supabase.from('topics').select('title, subject').eq('id', topicId).maybeSingle(),
    supabase
      .from('user_topic_notes')
      .select('content, color, created_at')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: true }),
  ]);

  if (!topic) return new Response('Topic not found', { status: 404 });

  const pdfBytes = await buildNotesPdf({
    topicTitle: `${topic.subject ? topic.subject + ' • ' : ''}${topic.title}`,
    notes: (notes ?? []).map((n) => ({
      content: n.content || '',
      color: n.color || 'primary',
      created_at: n.created_at,
    })),
  });

  return new Response(new Uint8Array(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="prepx-notes-${topicId}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
