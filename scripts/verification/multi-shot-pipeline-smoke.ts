// Sprint 7-C smoke — multi-shot video pipeline (schema + decomposer).
// Run: npx tsx scripts/verification/multi-shot-pipeline-smoke.ts

import { decomposeMarkers } from '../../lib/video/shot-decomposer';
import type { ScriptMarker } from '../../lib/agents/script-writer';

let pass = 0, fail = 0;
const ok = (n: string) => { pass++; console.log(`  PASS  ${n}`); };
const bad = (n: string, e: string) => { fail++; console.error(`  FAIL  ${n}: ${e}`); };

// 1. Empty markers → fallback single title shot
{
  const out = decomposeMarkers([], { title: 'Polity', durationSeconds: 60 });
  if (out.length === 1 && out[0].kind === 'title' && out[0].duration_seconds === 60)
    ok('empty markers fall back to single title shot');
  else bad('empty markers', JSON.stringify(out));
}

// 2. Equation cue routes to manim
{
  const m: ScriptMarker[] = [{
    time_seconds: 0, duration_seconds: 10,
    visual_cue: 'Show the integral equation for compound interest derivation',
    narration_chunk: 'Now let us derive...',
  }];
  const out = decomposeMarkers(m, { title: 't', durationSeconds: 10 });
  if (out[0].kind === 'manim') ok('equation cue → manim');
  else bad('manim heuristic', `got ${out[0].kind}`);
}

// 3. Long descriptive cue → comfy
{
  const m: ScriptMarker[] = [{
    time_seconds: 0, duration_seconds: 12,
    visual_cue: 'Wide cinematic shot of Indian parliament chamber with debate in session, golden light',
    narration_chunk: 'In the Lok Sabha...',
  }];
  const out = decomposeMarkers(m, { title: 't', durationSeconds: 12 });
  if (out[0].kind === 'comfy') ok('descriptive cue → comfy');
  else bad('comfy heuristic', `got ${out[0].kind}`);
}

// 4. Short caption-style cue → title
{
  const m: ScriptMarker[] = [{
    time_seconds: 0, duration_seconds: 4,
    visual_cue: 'Caption: Article 370',
    narration_chunk: 'Article 370.',
  }];
  const out = decomposeMarkers(m, { title: 't', durationSeconds: 4 });
  if (out[0].kind === 'title') ok('caption cue → title');
  else bad('title heuristic', `got ${out[0].kind}`);
}

// 5. Markers preserve order by time_seconds
{
  const m: ScriptMarker[] = [
    { time_seconds: 30, duration_seconds: 5, visual_cue: 'a', narration_chunk: 'a' },
    { time_seconds: 0,  duration_seconds: 5, visual_cue: 'b', narration_chunk: 'b' },
    { time_seconds: 15, duration_seconds: 5, visual_cue: 'c', narration_chunk: 'c' },
  ];
  const out = decomposeMarkers(m, { title: 't', durationSeconds: 60 });
  const positions = out.map(s => s.start_seconds);
  if (positions.join(',') === '0,15,30') ok('shots sorted by time_seconds');
  else bad('order', positions.join(','));
}

// 6. Position is dense 0..N-1
{
  const m: ScriptMarker[] = [
    { time_seconds: 0,  duration_seconds: 5, visual_cue: 'a', narration_chunk: 'a' },
    { time_seconds: 5,  duration_seconds: 5, visual_cue: 'b', narration_chunk: 'b' },
    { time_seconds: 10, duration_seconds: 5, visual_cue: 'c', narration_chunk: 'c' },
  ];
  const out = decomposeMarkers(m, { title: 't', durationSeconds: 15 });
  const positions = out.map(s => s.position).join(',');
  if (positions === '0,1,2') ok('positions are dense 0..N-1');
  else bad('positions', positions);
}

// 7. Duration is at least 1 (clamped)
{
  const m: ScriptMarker[] = [{
    time_seconds: 0, duration_seconds: 0,
    visual_cue: 'x', narration_chunk: '',
  }];
  const out = decomposeMarkers(m, { title: 't', durationSeconds: 1 });
  if (out[0].duration_seconds >= 1) ok('duration clamped to >= 1');
  else bad('duration clamp', String(out[0].duration_seconds));
}

async function checkSchema() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    const { data, error } = await sb
      .from('video_shots')
      .select('id, lecture_id, position, kind, status')
      .limit(1);
    if (error) bad('video_shots table reachable', error.message);
    else ok(`video_shots table reachable (rows seen: ${data?.length ?? 0})`);
  } else {
    console.log('  SKIP  video_shots reachability (no SUPABASE_SERVICE_ROLE_KEY)');
  }
}

checkSchema().then(() => {
  console.log(`\n${pass} PASS / ${fail} FAIL`);
  process.exit(fail > 0 ? 1 : 0);
});
