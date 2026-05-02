import 'server-only';
import { getAdminClient } from '../supabase-admin';
import { verifyArtifact } from '../agents/content-verifier';
import type { RefineJobPayload, RefineArtifactType } from '../queue/types';

// BullMQ processor for refine-jobs (Sprint 2, Epic 3.2).
//
// Loads the artifact (lecture_script | smart_book_chapter | research_article
// | quiz_question), runs verifyArtifact() against it, and writes the result
// into artifact_quality_audits.
//
// On 'passed' status we DO NOT auto-publish — admin still clicks. Refiner
// recommendation only.

interface AuditInsertResult {
  auditId: string;
  status: 'passed' | 'flagged' | 'rejected';
  score: number;
}

async function loadArtifact(
  artifactType: RefineArtifactType,
  artifactId: string,
): Promise<{ artifact: Record<string, any> | null; loadedFrom: string; error?: string }> {
  const sb = getAdminClient();

  switch (artifactType) {
    case 'lecture_script': {
      const { data, error } = await sb.from('video_scripts')
        .select('id, title, script_text, script_markers, source_citations, flesch_kincaid_grade, language, status')
        .eq('id', artifactId).maybeSingle();
      if (error) return { artifact: null, loadedFrom: 'video_scripts', error: error.message };
      return { artifact: data ?? null, loadedFrom: 'video_scripts' };
    }
    case 'smart_book_chapter': {
      const { data, error } = await sb.from('chapters')
        .select('id, title, introduction, detailed_content, summary, mnemonics, mock_questions, source_citations, flesch_kincaid_grade, status')
        .eq('id', artifactId).maybeSingle();
      if (error) return { artifact: null, loadedFrom: 'chapters', error: error.message };
      return { artifact: data ?? null, loadedFrom: 'chapters' };
    }
    case 'research_article': {
      const { data, error } = await sb.from('research_articles')
        .select('id, title, summary, body_text, content, source_url')
        .eq('id', artifactId).maybeSingle();
      if (error) return { artifact: null, loadedFrom: 'research_articles', error: error.message };
      return { artifact: data ?? null, loadedFrom: 'research_articles' };
    }
    case 'quiz_question': {
      // Quiz questions live inside `quizzes.questions` JSONB. The dispatcher
      // is responsible for resolving a single-question shape via payload.
      // Until the schema gains a dedicated quiz_questions table, we surface
      // this clearly so the admin can retrigger after migration — we do NOT
      // fake the load.
      return {
        artifact: null,
        loadedFrom: 'quizzes (no dedicated table)',
        error: 'quiz_question refinement requires a dedicated quiz_questions table or an in-payload artifact body; current schema stores questions inside quizzes.questions JSONB. Re-trigger after schema add.',
      };
    }
  }
}

export async function processRefineJob(
  job: { data: Record<string, any> },
  taskId: string,
): Promise<Record<string, any>> {
  const sb = getAdminClient();
  const data = job.data as RefineJobPayload & { source?: string };

  const artifactType = data.artifactType as RefineArtifactType;
  const artifactId = data.artifactId;
  const retriggerCount = Number.isInteger(data.retriggerCount) ? (data.retriggerCount as number) : 0;

  if (!artifactType || !artifactId) {
    throw new Error('processRefineJob: artifactType and artifactId required');
  }

  // Insert (or upsert) the audit row in 'running' state up-front so the admin
  // UI sees the verification in flight.
  const { data: runningRow, error: insErr } = await sb.from('artifact_quality_audits').insert({
    artifact_type: artifactType,
    artifact_id: artifactId,
    status: 'running',
    retrigger_count: retriggerCount,
  }).select('id').single();
  if (insErr || !runningRow) {
    // If the unique constraint fires (already audited at this retrigger
    // count), surface that — admin should bump retriggerCount via API.
    throw new Error(`processRefineJob: failed to create running audit row: ${insErr?.message}`);
  }
  const auditId = runningRow.id as string;

  const loaded = await loadArtifact(artifactType, artifactId);
  if (!loaded.artifact) {
    const reason = loaded.error || `${artifactType} ${artifactId} not found in ${loaded.loadedFrom}`;
    await sb.from('artifact_quality_audits').update({
      status: 'rejected',
      quality_score: 0,
      flags: [{ code: 'ARTIFACT_MISSING', severity: 'high', message: reason }],
      remediations: ['Re-spawn the generator agent or fix the schema, then re-trigger refinement.'],
      raw_report: { error: reason, loadedFrom: loaded.loadedFrom },
    }).eq('id', auditId);
    return { taskId, auditId, status: 'rejected', score: 0, error: reason };
  }

  const report = await verifyArtifact({ artifactType, artifact: loaded.artifact });

  const updatePayload: Record<string, any> = {
    status: report.status,
    quality_score: report.quality_score,
    readability_grade: report.readability_grade,
    citation_count: report.citation_count,
    citation_urls: report.citation_urls,
    syllabus_alignment_score: report.syllabus_alignment_score,
    flags: report.flags,
    remediations: report.remediations,
    raw_report: report.raw_report,
  };

  const { error: updErr } = await sb.from('artifact_quality_audits').update(updatePayload).eq('id', auditId);
  if (updErr) {
    throw new Error(`processRefineJob: audit update failed: ${updErr.message}`);
  }

  const result: AuditInsertResult = {
    auditId,
    status: report.status,
    score: report.quality_score,
  };
  return { taskId, ...result };
}
