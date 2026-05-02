import 'server-only';
import type { Job } from 'bullmq';
import { getAdminClient } from '../supabase-admin';
import { aiChat } from '../ai-router';

// Sprint 3 / S3-3 — Animated Mindmaps processor.
//
// Inputs: { topicId, chapterId? }.
// Loads the topic + the chapter content (passed chapterId, or latest published
// chapter for the topic). Asks the LLM for a hierarchical node tree, lays nodes
// out deterministically in 3D, and inserts animated_mindmaps + mindmap_nodes
// rows. Two-pass insert: root first, then BFS by depth so child rows can
// reference real parent uuids.

const ALLOWED_LAYOUTS = new Set(['radial', 'tree', 'force', 'timeline']);
const ALLOWED_COLORS = new Set([
  'primary', 'cyan', 'saffron', 'success', 'warning', 'muted', 'magenta', 'gold',
]);

interface LlmNode {
  id: string;                  // LLM-local id, e.g. "n0"
  parent_id: string | null;
  label: string;
  summary?: string;
  depth: number;
  color_hint?: string;
}

interface LlmMindmap {
  title: string;
  layout: 'radial' | 'tree' | 'force' | 'timeline';
  nodes: LlmNode[];
}

function clampSummary(s: string | undefined): string | null {
  if (!s) return null;
  const words = String(s).trim().split(/\s+/);
  return words.slice(0, 30).join(' ');
}

function safeColor(c: string | undefined): string | null {
  if (!c) return null;
  const k = String(c).toLowerCase();
  return ALLOWED_COLORS.has(k) ? k : null;
}

// Deterministic layout — depth-driven so the renderer doesn't need to do its
// own force-graph solve. Returns [x,y,z] tuples per LLM-local node id.
function layoutNodes(
  nodes: LlmNode[],
  layout: LlmMindmap['layout'],
): Map<string, [number, number, number]> {
  const positions = new Map<string, [number, number, number]>();
  const childrenOf = new Map<string | null, LlmNode[]>();
  for (const n of nodes) {
    const arr = childrenOf.get(n.parent_id) || [];
    arr.push(n);
    childrenOf.set(n.parent_id, arr);
  }

  // Find root (depth=0, parent_id=null). Fall back to first node.
  const root = nodes.find(n => n.depth === 0 && n.parent_id === null) || nodes[0];
  if (!root) return positions;
  positions.set(root.id, [0, 0, 0]);

  if (layout === 'radial') {
    const d1 = childrenOf.get(root.id) || [];
    d1.forEach((child, i) => {
      const theta = (i / Math.max(1, d1.length)) * Math.PI * 2;
      const r1 = 3;
      const cx = Math.cos(theta) * r1;
      const cz = Math.sin(theta) * r1;
      positions.set(child.id, [cx, 0, cz]);

      const d2 = childrenOf.get(child.id) || [];
      d2.forEach((leaf, j) => {
        const arc = (j / Math.max(1, d2.length)) * Math.PI - Math.PI / 2;
        const r2 = 1.5;
        const lx = cx + Math.cos(theta) * Math.cos(arc) * r2;
        const lz = cz + Math.sin(theta) * Math.cos(arc) * r2;
        const ly = Math.sin(arc) * r2;
        positions.set(leaf.id, [lx, ly, lz]);

        const d3 = childrenOf.get(leaf.id) || [];
        d3.forEach((g, k) => {
          const phi = (k / Math.max(1, d3.length)) * Math.PI * 2;
          positions.set(g.id, [
            lx + Math.cos(phi) * 0.7,
            ly + Math.sin(phi) * 0.7,
            lz,
          ]);
        });
      });
    });
  } else if (layout === 'tree') {
    // Y axis = depth (downwards), X = sibling spread.
    const byDepth = new Map<number, LlmNode[]>();
    for (const n of nodes) {
      const d = byDepth.get(n.depth) || [];
      d.push(n);
      byDepth.set(n.depth, d);
    }
    for (const [depth, list] of byDepth.entries()) {
      list.forEach((n, i) => {
        const xSpread = (list.length - 1) * 1.5;
        const x = i * 1.5 - xSpread / 2;
        positions.set(n.id, [x, -depth * 1.5, 0]);
      });
    }
  } else if (layout === 'timeline') {
    // X axis = depth*2, Y = sibling stagger.
    const byDepth = new Map<number, LlmNode[]>();
    for (const n of nodes) {
      const d = byDepth.get(n.depth) || [];
      d.push(n);
      byDepth.set(n.depth, d);
    }
    for (const [depth, list] of byDepth.entries()) {
      list.forEach((n, i) => {
        const ySpread = (list.length - 1) * 1.0;
        const y = i * 1.0 - ySpread / 2;
        positions.set(n.id, [depth * 2, y, 0]);
      });
    }
  } else {
    // 'force' — deterministic pseudo-random within a unit cube, seeded by id.
    let seed = 1337;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (const n of nodes) {
      if (n.id === root.id) continue;
      positions.set(n.id, [
        (rand() - 0.5) * 6,
        (rand() - 0.5) * 4,
        (rand() - 0.5) * 6,
      ]);
    }
  }

  // Backfill any node we missed (shouldn't happen, but defensive).
  for (const n of nodes) {
    if (!positions.has(n.id)) positions.set(n.id, [0, 0, 0]);
  }
  return positions;
}

function buildPrompt(args: {
  topicTitle: string;
  topicSubject: string | null;
  body: string;
  chapterTitle?: string;
}): string {
  const { topicTitle, topicSubject, body, chapterTitle } = args;
  const ctx = [
    `Topic: ${topicTitle}`,
    topicSubject ? `Subject: ${topicSubject}` : '',
    chapterTitle ? `Chapter: ${chapterTitle}` : '',
    '',
    body.slice(0, 6000),
  ].filter(Boolean).join('\n');
  return ctx;
}

async function generateMindmapJSON(args: {
  topicTitle: string;
  topicSubject: string | null;
  body: string;
  chapterTitle?: string;
}): Promise<LlmMindmap> {
  const sys = `You are an UPSC study assistant turning content into a hierarchical mindmap.
Return ONLY a JSON object with this exact shape:
{
  "title": string,
  "layout": "radial" | "tree" | "force" | "timeline",
  "nodes": [
    { "id": "n0", "parent_id": null, "label": "...", "summary": "<= 30 words", "depth": 0, "color_hint": "primary" },
    { "id": "n1", "parent_id": "n0", "label": "...", "summary": "...", "depth": 1, "color_hint": "cyan" }
  ]
}
Constraints:
- Exactly 1 root node (depth=0, parent_id=null).
- 4 to 7 depth-1 branches.
- Each depth-1 has 2 to 4 depth-2 leaves.
- Optional depth-3 nodes are allowed.
- Total node count between 15 and 30.
- depth must be between 0 and 6 inclusive.
- color_hint must be one of: primary, cyan, saffron, success, warning, muted, magenta, gold.
- Pick layout based on content: 'tree' for taxonomies, 'timeline' for chronologies, 'radial' for concept maps, 'force' for free-form networks.
- summary must be <= 30 words and avoid line breaks.`;

  const raw = await aiChat({
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: buildPrompt(args) },
    ],
    temperature: 0.5,
    maxTokens: 3000,
    jsonMode: true,
  });

  // Some providers wrap JSON in code fences even with jsonMode — strip defensively.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e: any) {
    throw new Error(`mindmap LLM returned invalid JSON: ${e?.message || e}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('mindmap LLM returned non-object');
  }
  if (!Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
    throw new Error('mindmap LLM returned no nodes');
  }
  if (!parsed.title || typeof parsed.title !== 'string') {
    throw new Error('mindmap LLM returned no title');
  }

  const layout = ALLOWED_LAYOUTS.has(parsed.layout) ? parsed.layout : 'radial';

  // Sanitize nodes — clamp depth, drop unknown color_hints, force unique ids.
  const seenIds = new Set<string>();
  const nodes: LlmNode[] = [];
  for (const n of parsed.nodes) {
    if (!n || typeof n !== 'object') continue;
    if (typeof n.id !== 'string' || !n.id) continue;
    if (seenIds.has(n.id)) continue;
    seenIds.add(n.id);
    const depth = Math.max(0, Math.min(6, Number(n.depth) || 0));
    const parent_id = (n.parent_id === null || n.parent_id === undefined) ? null : String(n.parent_id);
    nodes.push({
      id: n.id,
      parent_id,
      label: String(n.label || '').slice(0, 200) || 'Node',
      summary: clampSummary(n.summary) ?? undefined,
      depth,
      color_hint: safeColor(n.color_hint) || undefined,
    });
  }

  // Ensure exactly one root with parent_id=null. If LLM ignored, promote first.
  const roots = nodes.filter(n => n.depth === 0 && n.parent_id === null);
  if (roots.length === 0) {
    nodes[0].depth = 0;
    nodes[0].parent_id = null;
  } else if (roots.length > 1) {
    const keep = roots[0];
    for (const r of roots.slice(1)) {
      r.parent_id = keep.id;
      r.depth = Math.max(1, r.depth);
    }
  }

  // Drop nodes whose declared parent doesn't exist.
  const idSet = new Set(nodes.map(n => n.id));
  const valid = nodes.filter(n => n.parent_id === null || idSet.has(n.parent_id));

  if (valid.length < 3) {
    throw new Error(`mindmap LLM produced too few valid nodes: ${valid.length}`);
  }

  return {
    title: String(parsed.title).slice(0, 300),
    layout,
    nodes: valid,
  };
}

export async function processMindmapJob(
  job: Job,
  taskId: string,
): Promise<Record<string, any>> {
  const sb = getAdminClient();
  const topicId: string | undefined = job.data?.topicId;
  const chapterIdInput: string | undefined = job.data?.chapterId;

  if (!topicId) {
    throw new Error('processMindmapJob: topicId required');
  }

  // Step 1 — load topic
  const { data: topic, error: topicErr } = await sb
    .from('topics')
    .select('id, title, subject, content')
    .eq('id', topicId)
    .maybeSingle();
  if (topicErr) throw new Error(`topic fetch failed: ${topicErr.message}`);
  if (!topic) throw new Error(`topic not found: ${topicId}`);

  // Step 2 — load chapter (provided or latest published)
  let chapterTitle: string | undefined;
  let chapterBody = '';
  let chapterId: string | null = null;

  if (chapterIdInput) {
    const { data: ch, error: chErr } = await sb
      .from('chapters')
      .select('id, title, introduction, detailed_content, summary')
      .eq('id', chapterIdInput)
      .maybeSingle();
    if (chErr) throw new Error(`chapter fetch failed: ${chErr.message}`);
    if (!ch) throw new Error(`chapter not found: ${chapterIdInput}`);
    chapterId = ch.id as string;
    chapterTitle = ch.title as string;
    chapterBody = [ch.introduction, ch.detailed_content, ch.summary].filter(Boolean).join('\n\n');
  } else {
    const { data: ch } = await sb
      .from('chapters')
      .select('id, title, introduction, detailed_content, summary')
      .eq('topic_id', topicId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (ch) {
      chapterId = ch.id as string;
      chapterTitle = ch.title as string;
      chapterBody = [ch.introduction, ch.detailed_content, ch.summary].filter(Boolean).join('\n\n');
    }
  }

  // Step 3 — build content body. Fall back to topic.content if no chapter found.
  let body = chapterBody;
  if (!body) {
    const tc: any = topic.content || {};
    if (typeof tc === 'string') body = tc;
    else if (tc.markdown) body = String(tc.markdown);
    else if (tc.summary) body = String(tc.summary);
    else if (Array.isArray(tc.sections)) {
      body = tc.sections.map((s: any) => `${s.heading || ''}\n${s.body || ''}`).join('\n\n');
    } else {
      body = JSON.stringify(tc).slice(0, 4000);
    }
  }
  if (!body || body.length < 80) {
    throw new Error(`processMindmapJob: insufficient content for topic ${topicId}`);
  }

  // Step 4 — call LLM
  const llm = await generateMindmapJSON({
    topicTitle: topic.title as string,
    topicSubject: (topic.subject as string | null) ?? null,
    body,
    chapterTitle,
  });

  // Step 5 — insert mindmap row (status=generating)
  const insertRow: Record<string, any> = {
    topic_id: topicId,
    chapter_id: chapterId,
    title: llm.title,
    layout: llm.layout,
    status: 'generating',
    generated_by: 'mindmap-builder-v1',
  };
  const { data: mm, error: mmErr } = await sb
    .from('animated_mindmaps')
    .insert(insertRow)
    .select('id')
    .single();
  if (mmErr || !mm?.id) {
    throw new Error(`mindmap insert failed: ${mmErr?.message || 'no id'}`);
  }
  const mindmapId = mm.id as string;

  // Step 6 — layout positions (deterministic)
  const positions = layoutNodes(llm.nodes, llm.layout);

  // Step 7 — BFS insert nodes by depth so parent uuids resolve.
  const byDepth = new Map<number, LlmNode[]>();
  for (const n of llm.nodes) {
    const arr = byDepth.get(n.depth) || [];
    arr.push(n);
    byDepth.set(n.depth, arr);
  }
  const depths = Array.from(byDepth.keys()).sort((a, b) => a - b);
  const idMap = new Map<string, string>(); // LLM-id -> real uuid

  try {
    for (const d of depths) {
      const list = byDepth.get(d) || [];
      const rows = list.map(n => ({
        mindmap_id: mindmapId,
        parent_id: n.parent_id ? (idMap.get(n.parent_id) || null) : null,
        label: n.label,
        summary: n.summary ?? null,
        depth: n.depth,
        position: positions.get(n.id) || [0, 0, 0],
        color_hint: n.color_hint ?? null,
      }));
      const { data: inserted, error: nErr } = await sb
        .from('mindmap_nodes')
        .insert(rows)
        .select('id');
      if (nErr) throw new Error(`mindmap_nodes insert depth=${d} failed: ${nErr.message}`);
      if (!inserted || inserted.length !== list.length) {
        throw new Error(`mindmap_nodes insert depth=${d} returned ${inserted?.length} of ${list.length}`);
      }
      // Map LLM ids to real uuids in input order (Postgres preserves it).
      list.forEach((n, i) => idMap.set(n.id, inserted[i].id as string));
    }

    // Step 8 — flip status to ready.
    const { error: readyErr } = await sb
      .from('animated_mindmaps')
      .update({ status: 'ready' })
      .eq('id', mindmapId);
    if (readyErr) throw new Error(`mindmap ready flip failed: ${readyErr.message}`);
  } catch (err: any) {
    await sb.from('animated_mindmaps').update({ status: 'failed' }).eq('id', mindmapId);
    throw err;
  }

  return {
    taskId,
    mindmapId,
    nodeCount: llm.nodes.length,
    layout: llm.layout,
  };
}
