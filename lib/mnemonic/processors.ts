import 'server-only';
import type { Job } from 'bullmq';
import { getAdminClient } from '../supabase-admin';
import { aiChat } from '../ai-router';
import { parseSceneSpec, type SceneSpec } from '../3d/scene-spec';
import type { MnemonicJobPayload } from '../queue/types';

// Sprint 3 / S3-1 — Mnemonic Engine v2.
//
// Generates 4 mnemonic styles (acronym/story/rhyme/visual) for a topic, each
// with a SceneSpec that the R3F renderer animates inline. Free-tier users
// (`subscription_status = 'free'`) get only acronym + visual; paid users and
// catalog rows (userId null) get all 4. Inserts one row per style into
// `mnemonic_artifacts` with `render_status='r3f_only'`.

type Style = 'acronym' | 'story' | 'rhyme' | 'visual';
const ALL_STYLES: Style[] = ['acronym', 'story', 'rhyme', 'visual'];
const FREE_STYLES: Style[] = ['acronym', 'visual'];

interface StyleOutput {
  text: string;
  explanation: string;
  scene: SceneSpec;
}

interface LLMResponse {
  acronym: StyleOutput;
  story:   StyleOutput;
  rhyme:   StyleOutput;
  visual:  StyleOutput;
}

const SYSTEM_PROMPT = `You are a UPSC mnemonic generator. For the given topic you must emit FOUR mnemonics, one in each style: acronym, story, rhyme, visual. Every mnemonic ships with a 3D scene that the client renders with React Three Fiber.

Reply with a single JSON object — NO prose, NO markdown fences. Shape:
{
  "acronym": { "text": "...", "explanation": "...", "scene": <SceneSpec> },
  "story":   { "text": "...", "explanation": "...", "scene": <SceneSpec> },
  "rhyme":   { "text": "...", "explanation": "...", "scene": <SceneSpec> },
  "visual":  { "text": "...", "explanation": "...", "scene": <SceneSpec> }
}

SceneSpec contract (strict):
{
  "version": 1,
  "background": one of 'primary' | 'cyan' | 'saffron' | 'success' | 'warning' | 'muted' | 'magenta' | 'gold',
  "durationSeconds": number between 12 and 20,
  "meshes": array of 3-6 entries, each {
    "kind": one of 'sphere' | 'box' | 'torus' | 'cone' | 'icosahedron',
    "position": [x, y, z]   (numbers, |x|<=4, |y|<=3, |z|<=3),
    "scale":    [sx, sy, sz] OR a single number (default 1),
    "color":    one of 'primary' | 'cyan' | 'saffron' | 'success' | 'warning' | 'muted' | 'magenta' | 'gold',
    "emissive": boolean,
    "label":    short string under 16 chars (optional)
  },
  "cameraKeyframes": 2-3 entries, timestamps spanning 0 .. durationSeconds, each {
    "timeSeconds": number, "position": [x,y,z], "lookAt": [x,y,z]
  },
  "labels": 3-6 entries (one per mnemonic word/letter), each {
    "timeSeconds": number, "position": [x,y,z], "text": "...", "durationSeconds": 3
  },
  "ambientIntensity": 0.6
}

Constraints:
- Mesh positions must be visually spread out (not all at origin).
- Camera keyframes must orbit/dolly so the scene feels alive.
- Each label.text must reflect a word, letter, or phrase from the mnemonic itself.
- Keep "text" under 280 chars and "explanation" under 400 chars.`;

function buildUserPrompt(topicTitle: string, topicSubject: string | null) {
  const subj = topicSubject ? ` (subject: ${topicSubject})` : '';
  return `Topic: "${topicTitle}"${subj}

Generate the four mnemonics now. Return ONLY the JSON object — no commentary, no markdown.`;
}

function tryParseJson(raw: string): any | null {
  if (!raw) return null;
  // Strip code fences if the model added them despite instructions.
  const cleaned = raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  // Locate first '{' and last '}' to tolerate trailing/leading garbage.
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first < 0 || last < 0 || last <= first) return null;
  const slice = cleaned.slice(first, last + 1);
  try { return JSON.parse(slice); } catch { return null; }
}

function validateLLMResponse(parsed: any): LLMResponse | { error: string } {
  if (!parsed || typeof parsed !== 'object') return { error: 'not an object' };
  for (const style of ALL_STYLES) {
    const block = parsed[style];
    if (!block || typeof block !== 'object') return { error: `missing block for ${style}` };
    if (typeof block.text !== 'string' || block.text.trim().length === 0) {
      return { error: `${style}.text must be non-empty string` };
    }
    if (typeof block.explanation !== 'string' || block.explanation.trim().length === 0) {
      return { error: `${style}.explanation must be non-empty string` };
    }
    const scene = parseSceneSpec(block.scene);
    if (!scene) return { error: `${style}.scene failed parseSceneSpec` };
    if (scene.meshes.length < 3 || scene.meshes.length > 6) {
      return { error: `${style}.scene.meshes must have 3-6 entries (got ${scene.meshes.length})` };
    }
    if (scene.cameraKeyframes.length < 2) {
      return { error: `${style}.scene.cameraKeyframes must have >=2 entries` };
    }
    if (scene.labels.length < 3 || scene.labels.length > 6) {
      return { error: `${style}.scene.labels must have 3-6 entries (got ${scene.labels.length})` };
    }
    if (scene.durationSeconds < 12 || scene.durationSeconds > 20) {
      return { error: `${style}.scene.durationSeconds must be 12-20 (got ${scene.durationSeconds})` };
    }
  }
  return parsed as LLMResponse;
}

async function callLLM(topicTitle: string, topicSubject: string | null, strict: boolean): Promise<LLMResponse> {
  const sysContent = strict
    ? `${SYSTEM_PROMPT}\n\nIMPORTANT: Your previous output was not valid JSON. Output ONLY a single JSON object with the exact shape above. No prose, no markdown, no comments. Numeric arrays must be JSON arrays of numbers.`
    : SYSTEM_PROMPT;

  const raw = await aiChat({
    messages: [
      { role: 'system', content: sysContent },
      { role: 'user',   content: buildUserPrompt(topicTitle, topicSubject) },
    ],
    jsonMode: true,
    temperature: strict ? 0.2 : 0.5,
    maxTokens: 4000,
  });

  const parsed = tryParseJson(raw);
  if (!parsed) throw new Error('LLM returned malformed JSON');
  const validated = validateLLMResponse(parsed);
  if ('error' in validated) throw new Error(`LLM payload invalid: ${validated.error}`);
  return validated;
}

export async function processMnemonicJob(
  job: Job,
  taskId: string,
): Promise<Record<string, any>> {
  const sb = getAdminClient();
  const data = (job.data || {}) as MnemonicJobPayload;
  const topicId = data.topicId;
  const userId = data.userId ?? null;

  if (!topicId) throw new Error('processMnemonicJob: topicId missing in payload');

  const { data: topic, error: topicErr } = await sb.from('topics')
    .select('id, title, subject')
    .eq('id', topicId)
    .maybeSingle();
  if (topicErr) throw new Error(`processMnemonicJob: topic fetch failed: ${topicErr.message}`);
  if (!topic) throw new Error(`processMnemonicJob: topic ${topicId} not found`);

  // Free-tier gating — only matters when userId is set.
  let allowedStyles: Style[] = ALL_STYLES;
  if (userId) {
    const { data: u } = await sb.from('users')
      .select('subscription_status')
      .eq('id', userId)
      .maybeSingle();
    const status = (u?.subscription_status as string | undefined) || 'free';
    if (status === 'free') allowedStyles = FREE_STYLES;
  }

  let llmOut: LLMResponse;
  try {
    llmOut = await callLLM(topic.title as string, (topic.subject as string | null) ?? null, false);
  } catch (firstErr: any) {
    // Single retry with stricter preamble.
    llmOut = await callLLM(topic.title as string, (topic.subject as string | null) ?? null, true);
  }

  const insertRows = allowedStyles.map((style) => ({
    topic_id: topicId,
    user_id: userId,
    topic_query: topic.title as string,
    style,
    text: llmOut[style].text.trim().slice(0, 1000),
    explanation: llmOut[style].explanation.trim().slice(0, 2000),
    scene_spec: llmOut[style].scene,
    render_status: 'r3f_only',
    generated_by: 'mnemonic-engine-v2',
  }));

  const { data: inserted, error: insErr } = await sb
    .from('mnemonic_artifacts')
    .insert(insertRows)
    .select('id, style');

  if (insErr || !inserted) {
    throw new Error(`processMnemonicJob: insert failed: ${insErr?.message || 'no rows returned'}`);
  }

  return {
    taskId,
    topicId,
    userId,
    artifactIds: inserted.map((r: any) => r.id),
    styles: inserted.map((r: any) => r.style),
  };
}
