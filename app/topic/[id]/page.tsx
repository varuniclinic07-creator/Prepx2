import { getTopic } from '@/lib/supabase';
import { TopicViewer } from '@/components/TopicViewer';
import { createClient } from '@/lib/supabase-server';
import { MnemonicCards, type MnemonicCard } from '@/components/mnemonic/MnemonicCards';
import { MindmapSection } from '@/components/3d/MindmapSection';
import Link from 'next/link';

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topic = await getTopic(id);
  if (!topic) {
    return (
      <div className="py-20 text-center">
        <p className="text-xl text-slate-400">Topic not found</p>
        <Link href="/" className="text-emerald-400 hover:underline mt-4 inline-block">Back to Dashboard</Link>
      </div>
    );
  }

  // Sprint 2 / Epic 16.2: pull published Smart Book chapters for this topic.
  const sb = await createClient();
  const { data: chapters } = await sb.from('chapters')
    .select('id, chapter_num, version, title, introduction, detailed_content, mnemonics, mock_questions, mains_questions, summary, source_citations, ca_links')
    .eq('topic_id', id)
    .eq('status', 'published')
    .order('chapter_num', { ascending: true });

  // Sprint 3 / S3-1: pull mnemonics for this topic. RLS scopes to catalog +
  // owner so the unauthenticated case yields nothing — no leak.
  const { data: mnemonics } = await sb.from('mnemonic_artifacts')
    .select('id, topic_id, user_id, topic_query, style, text, explanation, scene_spec, render_status, comfy_video_url')
    .eq('topic_id', id)
    .order('created_at', { ascending: false });

  // Sprint 3 / S3-3: latest ready animated mindmap + nodes for this topic.
  const { data: mindmapRow } = await sb
    .from('animated_mindmaps')
    .select('id, topic_id, chapter_id, title, layout, status, preview_url, created_at')
    .eq('topic_id', id)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  let mindmapNodes: any[] = [];
  if (mindmapRow?.id) {
    const { data: nodes } = await sb
      .from('mindmap_nodes')
      .select('id, parent_id, label, summary, depth, position, color_hint')
      .eq('mindmap_id', mindmapRow.id)
      .order('depth', { ascending: true });
    mindmapNodes = nodes || [];
  }
  const { data: { user: mindmapAuthUser } } = await sb.auth.getUser();
  let isMindmapAdmin = false;
  if (mindmapAuthUser) {
    const { data: prof } = await sb.from('users').select('role').eq('id', mindmapAuthUser.id).maybeSingle();
    isMindmapAdmin = prof?.role === 'admin';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{topic.subject}</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{topic.title}</h1>
        </div>
        <Link
          href={`/quiz/${id}`}
          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition"
        >
          Take Quiz
        </Link>
      </div>
      <TopicViewer topic={topic} />

      {mnemonics && mnemonics.length > 0 && (
        <MnemonicCards items={mnemonics as unknown as MnemonicCard[]} />
      )}

      <MindmapSection
        topicId={id}
        isAdmin={isMindmapAdmin}
        initialMindmap={mindmapRow as any}
        initialNodes={mindmapNodes as any}
      />


      {chapters && chapters.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-slate-100 border-t border-slate-800 pt-6">
            Smart Book chapters
          </h2>
          {chapters.map((ch: any) => (
            <ChapterArticle key={ch.id} chapter={ch} />
          ))}
        </section>
      )}
    </div>
  );
}

function ChapterArticle({ chapter }: { chapter: any }) {
  const mnemonics: any[] = Array.isArray(chapter.mnemonics) ? chapter.mnemonics : [];
  const mocks: any[] = Array.isArray(chapter.mock_questions) ? chapter.mock_questions : [];
  const mains: any[] = Array.isArray(chapter.mains_questions) ? chapter.mains_questions : [];
  const citations: any[] = Array.isArray(chapter.source_citations) ? chapter.source_citations : [];
  const caLinks: any[] = Array.isArray(chapter.ca_links) ? chapter.ca_links : [];

  return (
    <article className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
      <header>
        <div className="text-xs uppercase tracking-wider text-slate-500">
          Chapter {chapter.chapter_num} · v{chapter.version}
        </div>
        <h3 className="text-2xl font-bold text-slate-100 mt-1">{chapter.title}</h3>
      </header>

      <p className="text-slate-300 leading-relaxed whitespace-pre-line">{chapter.introduction}</p>

      <div className="text-slate-300 leading-relaxed whitespace-pre-line">
        {chapter.detailed_content}
      </div>

      {mnemonics.length > 0 && (
        <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-4">
          <h4 className="font-semibold text-slate-200 mb-2">Mnemonics</h4>
          <ul className="space-y-2">
            {mnemonics.map((m, i) => (
              <li key={i} className="text-sm text-slate-300">
                <span className="text-xs uppercase text-slate-500 mr-2">[{m.type}]</span>
                {m.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mocks.length > 0 && (
        <details className="bg-slate-950/50 border border-slate-800 rounded-lg p-4">
          <summary className="font-semibold text-slate-200 cursor-pointer">
            Mock MCQs ({mocks.length})
          </summary>
          <ol className="mt-3 space-y-4 list-decimal list-inside">
            {mocks.map((q, i) => (
              <li key={i} className="text-sm text-slate-300">
                <div className="font-medium">{q.question}</div>
                <ul className="ml-6 mt-1 space-y-1">
                  {(q.options || []).map((opt: string, j: number) => (
                    <li key={j} className={j === q.correctIndex ? 'text-emerald-300' : 'text-slate-400'}>
                      {String.fromCharCode(65 + j)}. {opt}
                      {j === q.correctIndex && ' ✓'}
                    </li>
                  ))}
                </ul>
                {q.explanation && (
                  <div className="mt-1 text-xs text-slate-500">Why: {q.explanation}</div>
                )}
              </li>
            ))}
          </ol>
        </details>
      )}

      {mains.length > 0 && (
        <details className="bg-slate-950/50 border border-slate-800 rounded-lg p-4">
          <summary className="font-semibold text-slate-200 cursor-pointer">
            Mains questions ({mains.length})
          </summary>
          <ol className="mt-3 space-y-3 list-decimal list-inside">
            {mains.map((q, i) => (
              <li key={i} className="text-sm text-slate-300">
                <div className="font-medium">{q.question}</div>
                {Array.isArray(q.expectedPoints) && q.expectedPoints.length > 0 && (
                  <ul className="ml-6 mt-1 list-disc text-slate-400">
                    {q.expectedPoints.map((p: string, j: number) => (
                      <li key={j}>{p}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </details>
      )}

      {chapter.summary && (
        <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-4">
          <h4 className="font-semibold text-emerald-300 mb-2">Summary</h4>
          <p className="text-sm text-slate-300 whitespace-pre-line">{chapter.summary}</p>
        </div>
      )}

      {(citations.length > 0 || caLinks.length > 0) && (
        <footer className="pt-4 border-t border-slate-800 text-xs text-slate-500 space-y-2">
          {citations.length > 0 && (
            <div>
              <span className="font-semibold text-slate-400">Citations: </span>
              {citations.map((c, i) => (
                <span key={i}>
                  {c.url ? (
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                      {c.source} — {c.reference}
                    </a>
                  ) : (
                    <span>{c.source} — {c.reference}</span>
                  )}
                  {i < citations.length - 1 ? '; ' : ''}
                </span>
              ))}
            </div>
          )}
          {caLinks.length > 0 && (
            <div>
              <span className="font-semibold text-slate-400">Current affairs: </span>
              {caLinks.map((c, i) => (
                <span key={i}>
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                    {c.headline}
                  </a>
                  {i < caLinks.length - 1 ? '; ' : ''}
                </span>
              ))}
            </div>
          )}
        </footer>
      )}
    </article>
  );
}
