// Strict payload shapes per queue. The worker uses these to refuse malformed
// jobs at the boundary instead of letting them throw mid-processor.

export type CoachAgent = 'prelims' | 'mains' | 'interview';

export interface CoachJobPayload {
  taskId: string;          // agent_tasks.id, also the BullMQ jobId
  userId: string;
  agentType: CoachAgent;
  userContext: string;     // free text, fed to GuideAgent.coach()
  userAction: string;
}

export interface StudyJobPayload {
  taskId: string;
  userId: string;
  reason?: string;
}

export interface ResearchJobPayload {
  taskId: string;
  sourceId: string;        // matches lib/scraper/config.ts SourceConfig.id
  sourceName?: string;
}

export interface ContentJobPayload {
  taskId: string;
  topicId?: string;
  syllabusTag?: string;
  reason?: string;
}

export interface ScriptJobPayload {
  taskId: string;
  topicId: string;
  durationMinutes?: number;
}

export interface RenderJobPayload {
  taskId: string;
  scriptId: string;
}

export interface DeadLetterPayload {
  taskId: string;
  originQueue: string;
  reason: string;
}

export type RefineArtifactType =
  | 'lecture_script'
  | 'smart_book_chapter'
  | 'research_article'
  | 'quiz_question';

export interface RefineJobPayload {
  taskId: string;
  artifactType: RefineArtifactType;
  artifactId: string;
  retriggerCount?: number;
}

export interface BundleJobPayload {
  taskId: string;
  bundleDate?: string; // YYYY-MM-DD; defaults to today (IST) if omitted
}

// Sprint 3 — premium artifact generation queues.
//
// Each of these jobs produces a row in its feature's table plus an asset/
// manifest the UI can render. GPU-bound steps (Remotion / Manim / ComfyUI /
// LTX 2.3) emit a render manifest; the actual GPU service consumes that
// manifest out-of-band. The processor still completes successfully and the
// row is queryable in a 'pending_render' state — never a stub.

export interface MnemonicJobPayload {
  taskId: string;
  topicId: string;
  userId?: string;             // null when generated for the public catalog
  style?: 'acronym' | 'story' | 'rhyme' | 'visual';
}

export interface ImagineVideoJobPayload {
  taskId: string;
  topicQuery: string;          // free-text — "Big Bang", "Dinosaurs", "BCE timeline"
  userId: string;
  durationSeconds?: number;    // default 60, max 300
  videoId?: string;            // imagine_videos.id pre-inserted by API; processor populates the row
  extendVideoId?: string;      // when set, processor appends ~30s of beats to the existing row
}

export interface MindmapJobPayload {
  taskId: string;
  topicId: string;
  chapterId?: string;
}

export interface ShortsJobPayload {
  taskId: string;
  topicId: string;
  conceptTag: string;          // syllabus tag the short focuses on
  durationSeconds?: number;    // 120-300
}

export interface CaVideoJobPayload {
  taskId: string;
  bundleId: string;            // references ca_daily_bundles.id
}

export interface InterviewJobPayload {
  taskId: string;
  sessionId: string;
  userId: string;
  phase: 'panel-question' | 'debrief-render';
}

// Sprint 9-A — async lecture generation. Wraps the canonical MVP orchestrator
// (lib/lecture/orchestrator.ts) so a long-running pipeline (10-15 min full LTX
// bake) runs out-of-band of the HTTP request.
export type LectureStage =
  | 'queued'
  | 'pedagogy'
  | 'shot-planning'
  | 'ltx-render'
  | 'manim-render'
  | 'narration'
  | 'subtitles'
  | 'composition'
  | 'notes'
  | 'quiz'
  | 'finalizing'
  | 'completed'
  | 'failed';

export interface LectureGenerateJobPayload {
  taskId: string;
  jobId: string;                // lecture_jobs.id
  userId: string;
  topic: string;                // canonical slug or free-text title
  durationSeconds?: number;     // target lecture length, default 35
  style?: 'classroom' | 'concept-short';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  language?: 'en' | 'hi' | 'hinglish';
  outputFormat?: 'mp4-1280x720';
  skipLtx?: boolean;            // bypass live ComfyUI, use placeholder shots
  // When provided, the orchestrator skips its hardcoded LECTURE_PLAN and bakes
  // this plan instead. Used by Sprint 9-B (Product B) to feed simplified
  // teacher-style scenes derived from a parsed PDF/image/DOCX.
  planJson?: unknown;
  // Sprint 9-C slice-2 — opt-in Remotion parallel render. ffmpeg lecture.mp4
  // always produced; lecture-remotion.mp4 only when this is true.
  useRemotion?: boolean;
}

// Sprint 9-B — Product B "Explain This" / AI Doubt Solver. Wraps a parsed
// document (PDF/DOCX/PPT/image/text) into a 60-120 s cinematic explainer +
// notes + recap + 5-Q quiz. Internally calls the lecture orchestrator.
export type ConceptStage =
  | 'queued'
  | 'parsing'
  | 'extracting'
  | 'simplifying'
  | 'planning'
  | 'lecture-generating'
  | 'finalizing'
  | 'completed'
  | 'failed';

export interface ConceptGenerateJobPayload {
  taskId: string;
  jobId: string;                  // concept_jobs.id
  userId: string;
  conceptId: string;              // cpt_{slug}_{shortHash}_{epochMs}
  documentType: 'pdf' | 'docx' | 'pptx' | 'image' | 'text';
  sourceStoragePath?: string;     // concepts-mvp/{userId}/sources/{conceptId}.{ext} — empty when documentType='text'
  rawText?: string;               // present when documentType='text'
  documentName?: string;
  style?: 'classroom' | 'concept-short';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  language?: 'en' | 'hi' | 'hinglish';
  durationSeconds?: number;       // 60-120, default 90
  outputFormat?: 'mp4-1280x720';
  skipLtx?: boolean;
  // Sprint 9-C slice-2 — opt-in Remotion parallel render. Adds
  // explainer-remotion.mp4 alongside explainer.mp4 in the bundle.
  useRemotion?: boolean;
}

export type QueueName =
  | 'study-jobs'
  | 'research-jobs'
  | 'content-jobs'
  | 'script-jobs'
  | 'render-jobs'
  | 'coach-jobs'
  | 'refine-jobs'
  | 'bundle-jobs'
  | 'mnemonic-jobs'
  | 'imagine-jobs'
  | 'mindmap-jobs'
  | 'shorts-jobs'
  | 'ca-video-jobs'
  | 'interview-jobs'
  | 'lecture-generate'
  | 'concept-generate'
  | 'dead-letter';

export const ALL_QUEUE_NAMES: QueueName[] = [
  'study-jobs',
  'research-jobs',
  'content-jobs',
  'script-jobs',
  'render-jobs',
  'coach-jobs',
  'refine-jobs',
  'bundle-jobs',
  'mnemonic-jobs',
  'imagine-jobs',
  'mindmap-jobs',
  'shorts-jobs',
  'ca-video-jobs',
  'interview-jobs',
  'lecture-generate',
  'concept-generate',
  'dead-letter',
];

// agent_type strings stored in agent_tasks.agent_type. Keep these stable —
// they are also the partition key for `claim_next_agent_task`.
export type AgentType =
  | 'study'
  | 'research'
  | 'content'
  | 'script'
  | 'render'
  | 'coach'
  | 'refine'
  | 'bundle'
  | 'mnemonic'
  | 'imagine'
  | 'mindmap'
  | 'shorts'
  | 'ca_video'
  | 'interview'
  | 'lecture_generate'
  | 'concept_generate';

export const QUEUE_FOR_AGENT: Record<AgentType, QueueName> = {
  study:           'study-jobs',
  research:        'research-jobs',
  content:         'content-jobs',
  script:          'script-jobs',
  render:          'render-jobs',
  coach:           'coach-jobs',
  refine:          'refine-jobs',
  bundle:          'bundle-jobs',
  mnemonic:        'mnemonic-jobs',
  imagine:         'imagine-jobs',
  mindmap:         'mindmap-jobs',
  shorts:          'shorts-jobs',
  ca_video:        'ca-video-jobs',
  interview:       'interview-jobs',
  lecture_generate:'lecture-generate',
  concept_generate:'concept-generate',
};
