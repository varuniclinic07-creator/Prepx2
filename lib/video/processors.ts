import { getAdminClient } from '../supabase-admin';
import { generateLectureScript } from '../agents/script-writer';
import {
  generateSmartBookChapter,
  validateChapter,
  type GeneratedChapter,
} from '../agents/chapter-writer';
import { spawnAgent } from '../agents/hermes-dispatch';
import { processRenderJobMultiShot } from './multi-shot-processor';

// Real BullMQ processors for content-jobs / script-jobs / render-jobs.
// Replace the deferred no-ops in workers/hermes-worker.ts.

// ──────────────────────────────────────────────────────────────────────────
// content-jobs (Sprint 2, Epic 16.2): generate a Smart Book chapter for the
// topic. Triggered by:
//   - lib/scraper/processor.ts cascade (when a research article is newly
//     linked to a topic)
//   - the Hermes content sweep (stale or missing topic content)
//   - admin "Regenerate" button
// Output: a row in `chapters` with status either 'generated_pending_approval'
// (validation passed) or 'draft' (validation failed, admin can review).
// ──────────────────────────────────────────────────────────────────────────

export async function processContentJob(
  job: { data: Record<string, any> },
  taskId: string,
): Promise<Record<string, any>> {
  const sb = getAdminClient();
  const topicId: string | undefined = job.data?.topicId;
  if (!topicId) return { taskId, skipped: 'no topicId' };

  const { data: topic } = await sb.from('topics')
    .select('id, title, content, syllabus_tag')
    .eq('id', topicId).maybeSingle();
  if (!topic) return { taskId, error: 'topic not found' };

  // Determine next chapter_num + version. We treat each content-job as a
  // new chapter slot unless one already exists for this topic — in which
  // case we bump the version of chapter_num=1 (the only chapter we
  // currently generate per topic; multi-chapter expansion is future work).
  const { data: existing } = await sb.from('chapters')
    .select('chapter_num, version')
    .eq('topic_id', topicId);
  const rows = existing || [];
  const distinctNums = new Set(rows.map((r: any) => r.chapter_num));
  const chapterNum = distinctNums.size === 0 ? 1 : 1; // single-chapter regime
  const versionsForNum = rows.filter((r: any) => r.chapter_num === chapterNum)
    .map((r: any) => Number(r.version) || 1);
  const version = versionsForNum.length === 0 ? 1 : Math.max(...versionsForNum) + 1;

  // Pull the last 5 linked research articles for this topic so the LLM can
  // weave current-affairs hooks into ca_links.
  const { data: linkRows } = await sb.from('research_topic_links')
    .select('article_id, created_at')
    .eq('topic_id', topicId)
    .order('created_at', { ascending: false })
    .limit(5);
  const articleIds: string[] = (linkRows || []).map((r: any) => r.article_id).filter(Boolean);
  let recentArticles: Array<{ id: string; title: string; url: string }> = [];
  if (articleIds.length > 0) {
    const { data: articles } = await sb.from('research_articles')
      .select('id, title, source_url')
      .in('id', articleIds);
    recentArticles = (articles || []).map((a: any) => ({
      id: a.id,
      title: a.title || '(untitled)',
      url: a.source_url || '',
    }));
  }

  // Generate via LLM.
  const chapter: GeneratedChapter = await generateSmartBookChapter({
    topicId,
    topicTitle: topic.title,
    syllabusTag: topic.syllabus_tag,
    recentArticles,
  });

  // Validate.
  const verdict = validateChapter(chapter);
  const status = verdict.ok ? 'generated_pending_approval' : 'draft';
  const rejectedReason = verdict.ok ? null : verdict.errors.join('; ');

  // Insert chapters row.
  const { data: inserted, error: insErr } = await sb.from('chapters').insert({
    topic_id: topicId,
    chapter_num: chapterNum,
    version,
    title: chapter.title,
    introduction: chapter.introduction,
    detailed_content: chapter.detailed_content,
    mnemonics: chapter.mnemonics,
    mock_questions: chapter.mock_questions,
    mains_questions: chapter.mains_questions,
    pyqs: chapter.pyqs,
    summary: chapter.summary,
    ca_links: chapter.ca_links,
    flesch_kincaid_grade: chapter.flesch_kincaid_grade,
    source_citations: chapter.source_citations,
    status,
    generated_by_agent: chapter.generated_by_agent,
    rejected_reason: rejectedReason,
  }).select('id').single();
  if (insErr || !inserted) {
    throw new Error(`processContentJob: insert chapters failed: ${insErr?.message}`);
  }

  // Merge {latest_chapter_id, last_chapter_generated_at} into topics.content.
  const existingContent = (topic.content && typeof topic.content === 'object')
    ? topic.content as Record<string, any>
    : {};
  const mergedContent = {
    ...existingContent,
    latest_chapter_id: inserted.id,
    last_chapter_generated_at: new Date().toISOString(),
  };
  await sb.from('topics').update({
    content: mergedContent,
    updated_at: new Date().toISOString(),
  }).eq('id', topicId);

  // Auto-spawn a refine-job (Sprint 2 / Epic 3.2) when the chapter clears the
  // primary validator. Failure to enqueue is non-fatal — the chapter is still
  // saved; admin can retrigger from the refine UI.
  let refineTaskId: string | null = null;
  if (status === 'generated_pending_approval') {
    try {
      const queued = await spawnAgent(sb, {
        agentType: 'refine',
        payload: {
          source: 'content-job-auto',
          artifactType: 'smart_book_chapter',
          artifactId: inserted.id,
          retriggerCount: 0,
        },
        priority: 5,
      });
      refineTaskId = queued.taskId;
    } catch (err: any) {
      // Swallow but report — refine is a downstream gate, not a hard requirement.
      refineTaskId = null;
    }
  }

  return {
    taskId,
    topicId,
    chapterId: inserted.id,
    status,
    fkGrade: chapter.flesch_kincaid_grade,
    citationsCount: chapter.source_citations.length,
    mnemonicsCount: chapter.mnemonics.length,
    validationErrors: verdict.errors,
    refineTaskId,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// script-jobs: generate a 30-45 minute lecture script from a topic and
// persist a video_scripts row in 'draft' status for admin approval.
// ──────────────────────────────────────────────────────────────────────────

export async function processScriptJob(
  job: { data: Record<string, any> },
  taskId: string,
): Promise<Record<string, any>> {
  const sb = getAdminClient();
  const topicId: string = job.data?.topicId;
  const durationMinutes: number = job.data?.durationMinutes ?? 30;
  const language: 'en' | 'hi' = job.data?.language ?? 'en';
  if (!topicId) throw new Error('processScriptJob: topicId required');

  const { data: topic, error: topicErr } = await sb.from('topics')
    .select('id, title, syllabus_tag, content, subject, paper')
    .eq('id', topicId).single();
  if (topicErr || !topic) throw new Error(`processScriptJob: topic not found: ${topicErr?.message}`);

  const topicBody = typeof topic.content === 'string'
    ? topic.content
    : (topic.content && typeof topic.content === 'object' ? JSON.stringify(topic.content).slice(0, 8000) : '');

  const script = await generateLectureScript({
    topicTitle: topic.title,
    topicBody,
    syllabusTag: topic.syllabus_tag,
    paper: topic.paper,
    durationMinutes,
    language,
  });

  const { data: row, error: insErr } = await sb.from('video_scripts').insert({
    topic_id: topicId,
    subject: topic.subject ?? null,
    paper: topic.paper ?? null,
    title: script.title,
    script_text: script.scriptText,
    script_markers: script.markers,
    chapters: script.chapters,
    duration_target_seconds: script.durationSeconds,
    status: 'draft',
    generated_by_agent: 'AIVideoAgent',
    source_citations: script.citations,
    flesch_kincaid_grade: script.fleschKincaid,
    language: script.language,
  }).select('id').single();
  if (insErr || !row) throw new Error(`processScriptJob: insert failed: ${insErr?.message}`);

  // Auto-spawn a refine-job (Sprint 2 / Epic 3.2) on every fresh draft so the
  // admin sees the second-pass quality report alongside the script. Defaults
  // to ON; callers can disable by passing autoRefine: false explicitly.
  const autoRefine = job.data?.autoRefine !== false;
  let refineTaskId: string | null = null;
  if (autoRefine) {
    try {
      const queued = await spawnAgent(sb, {
        agentType: 'refine',
        payload: {
          source: 'script-job-auto',
          artifactType: 'lecture_script',
          artifactId: row.id,
          retriggerCount: 0,
        },
        priority: 5,
      });
      refineTaskId = queued.taskId;
    } catch {
      refineTaskId = null;
    }
  }

  return { taskId, scriptId: row.id, durationSeconds: script.durationSeconds, fk: script.fleschKincaid, refineTaskId };
}

// ──────────────────────────────────────────────────────────────────────────
// render-jobs: delegate to the multi-shot processor. The legacy single-prompt
// pipeline rendered only the first marker; the multi-shot version decomposes
// the script into per-shot rows (title / manim / comfy / narration), drives
// each through the appropriate renderer, and writes an ffmpeg merge manifest
// for the final bake step.
// ──────────────────────────────────────────────────────────────────────────

export async function processRenderJob(
  job: { data: Record<string, any> },
  taskId: string,
): Promise<Record<string, any>> {
  return processRenderJobMultiShot(job, taskId);
}
