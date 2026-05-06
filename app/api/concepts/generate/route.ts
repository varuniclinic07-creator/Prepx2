import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { spawnAgent } from '@/lib/agents/hermes-dispatch';
import { uploadConceptSource } from '@/lib/concept/storage';
import type { ConceptGenerateJobPayload } from '@/lib/queue/types';

// "Explain This" / AI Doubt Solver — Sprint 9-B.
//
// Two ingestion modes:
//   1. multipart/form-data — single file under field "document" (PDF/DOCX/etc)
//      + optional JSON-encoded "options" field with style/difficulty/language.
//   2. application/json — { rawText, ...options } for paste-text flows.

const OPTIONS_SCHEMA = z.object({
  style: z.enum(['classroom', 'concept-short']).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  language: z.enum(['en', 'hi', 'hinglish']).optional(),
  durationSeconds: z.number().int().min(60).max(120).optional(),
  outputFormat: z.literal('mp4-1280x720').optional(),
  skipLtx: z.boolean().optional(),
});

const TEXT_BODY_SCHEMA = OPTIONS_SCHEMA.extend({
  rawText: z.string().min(30).max(60_000),
  documentName: z.string().max(120).optional(),
});

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

function inferDocType(filename: string, mime: string): 'pdf'|'docx'|'pptx'|'image'|null {
  const lower = filename.toLowerCase();
  if (mime === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf';
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || lower.endsWith('.docx')) return 'docx';
  if (mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || lower.endsWith('.pptx')) return 'pptx';
  if (mime.startsWith('image/')) return 'image';
  return null;
}

function provisionalConceptId(): string {
  return `pending_${randomBytes(6).toString('hex')}_${Date.now()}`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminClient();
  const contentType = req.headers.get('content-type') || '';

  let documentType: ConceptGenerateJobPayload['documentType'];
  let rawText: string | undefined;
  let documentName: string | undefined;
  let sourceStoragePath: string | undefined;
  let options: z.infer<typeof OPTIONS_SCHEMA> = {};

  const conceptId = provisionalConceptId();

  if (contentType.startsWith('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('document');
    const optsRaw = form.get('options');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'multipart body missing "document" file field' }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: `file too large (${file.size} > ${MAX_UPLOAD_BYTES} bytes)` }, { status: 413 });
    }
    const inferred = inferDocType(file.name || 'upload.bin', file.type || '');
    if (!inferred) {
      return NextResponse.json({ error: `unsupported document type (${file.type}, ${file.name})` }, { status: 415 });
    }
    if (inferred === 'pptx' || inferred === 'image') {
      return NextResponse.json({ error: `documentType=${inferred} not yet supported (Day-2 OCR/PPT)` }, { status: 415 });
    }
    documentType = inferred;
    documentName = file.name || `upload.${inferred}`;
    if (typeof optsRaw === 'string' && optsRaw.length > 0) {
      try {
        const parsed = OPTIONS_SCHEMA.safeParse(JSON.parse(optsRaw));
        if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
        options = parsed.data;
      } catch {
        return NextResponse.json({ error: 'invalid JSON in "options" field' }, { status: 400 });
      }
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = inferred === 'pdf' ? 'pdf' : inferred === 'docx' ? 'docx' : inferred === 'pptx' ? 'pptx' : 'bin';
    const mime = file.type || 'application/octet-stream';
    const upload = await uploadConceptSource(user.id, conceptId, ext, buf, mime);
    sourceStoragePath = upload.storagePath;
  } else {
    let parsedBody: unknown;
    try { parsedBody = await req.json(); } catch {
      return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
    }
    const parsed = TEXT_BODY_SCHEMA.safeParse(parsedBody);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }
    documentType = 'text';
    rawText = parsed.data.rawText;
    documentName = parsed.data.documentName;
    options = {
      style: parsed.data.style,
      difficulty: parsed.data.difficulty,
      language: parsed.data.language,
      durationSeconds: parsed.data.durationSeconds,
      outputFormat: parsed.data.outputFormat,
      skipLtx: parsed.data.skipLtx,
    };
  }

  // Pre-create the concept_jobs row.
  const { data: row, error: insertErr } = await admin
    .from('concept_jobs')
    .insert({
      user_id: user.id,
      concept_id: conceptId,
      document_name: documentName,
      document_type: documentType,
      source_storage_path: sourceStoragePath,
      params: options,
      status: 'queued',
    })
    .select('id, concept_id')
    .single();

  if (insertErr || !row?.id) {
    return NextResponse.json({ error: insertErr?.message || 'concept_jobs insert failed' }, { status: 500 });
  }

  const dispatch = await spawnAgent(admin, {
    agentType: 'concept_generate',
    userId: user.id,
    payload: {
      jobId: row.id,
      userId: user.id,
      conceptId,
      documentType,
      sourceStoragePath,
      rawText,
      documentName,
      style: options.style,
      difficulty: options.difficulty,
      language: options.language,
      durationSeconds: options.durationSeconds,
      outputFormat: options.outputFormat,
      skipLtx: options.skipLtx,
    } satisfies Omit<ConceptGenerateJobPayload, 'taskId'>,
    priority: 4,
  });

  await admin.from('concept_jobs').update({ task_id: dispatch.taskId }).eq('id', row.id);

  return NextResponse.json({
    jobId: row.id,
    conceptId,
    taskId: dispatch.taskId,
    queueName: dispatch.queueName,
    status: 'queued',
  }, { status: 202 });
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('concept_jobs')
    .select('id, concept_id, document_name, document_type, detected_topic, status, progress_percent, created_at, updated_at, completed_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}
