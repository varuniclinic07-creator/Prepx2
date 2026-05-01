import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getQueue, getQueueDepths } from '../queue/queues';
import { QUEUE_FOR_AGENT, type AgentType, type QueueName } from '../queue/types';
import { SOURCE_REGISTRY } from '../scraper/config';

// Hermes dispatcher (B2-2): real spawn + sweeps + status.
// Importing this file pulls BullMQ + ioredis, which depend on Node net/fs/dns.
// Only API routes, server components, and the worker process may import it.

export interface SpawnAgentInput {
  agentType: AgentType;
  userId?: string | null;
  tenantId?: string | null;
  payload: Record<string, any>;
  priority?: number;
  scheduledFor?: string | null;
  maxRetries?: number;
}

export interface SpawnAgentResult {
  taskId: string;
  queueName: QueueName;
  jobId: string;
}

export async function spawnAgent(
  supabase: SupabaseClient,
  input: SpawnAgentInput
): Promise<SpawnAgentResult> {
  const queueName = QUEUE_FOR_AGENT[input.agentType];
  if (!queueName) {
    throw new Error(`spawnAgent: unknown agent_type "${input.agentType}"`);
  }

  const insertRow: Record<string, any> = {
    agent_type:    input.agentType,
    status:        'queued',
    payload:       input.payload,
    user_id:       input.userId ?? null,
    tenant_id:     input.tenantId ?? null,
    priority:      input.priority ?? 5,
    max_retries:   input.maxRetries ?? 3,
    scheduled_for: input.scheduledFor ?? null,
  };

  const { data, error } = await supabase
    .from('agent_tasks')
    .insert(insertRow)
    .select('id')
    .single();

  if (error || !data?.id) {
    throw new Error(`spawnAgent: failed to insert agent_task: ${error?.message || 'no id returned'}`);
  }

  const taskId = data.id as string;
  const queue = getQueue(queueName);

  const jobOpts: Record<string, any> = {
    jobId: taskId,
    priority: input.priority ?? 5,
  };
  if (input.scheduledFor) {
    const delay = Math.max(0, new Date(input.scheduledFor).getTime() - Date.now());
    if (delay > 0) jobOpts.delay = delay;
  }

  const job = await queue.add(input.agentType, { ...input.payload, taskId }, jobOpts);
  return { taskId, queueName, jobId: String(job.id) };
}

export async function runHermesPlanner(supabase: SupabaseClient): Promise<{
  usersConsidered: number;
  coachQueued: number;
  studyQueued: number;
}> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: sessions } = await supabase
    .from('user_sessions')
    .select('user_id, session_state, last_activity_at')
    .gt('last_activity_at', cutoff);

  let coachQueued = 0;
  let studyQueued = 0;
  const userIds = (sessions || []).map((s: any) => s.user_id).filter(Boolean);

  for (const userId of userIds) {
    const { data: weak } = await supabase
      .from('user_weak_areas')
      .select('topic_id, gap_type, severity')
      .eq('user_id', userId)
      .order('severity', { ascending: false })
      .limit(1);

    if (weak && weak.length > 0) {
      await spawnAgent(supabase, {
        agentType: 'study',
        userId,
        payload: {
          source: 'hermes-planner',
          topicId: weak[0].topic_id,
          gapType: weak[0].gap_type,
          severity: weak[0].severity,
        },
      });
      studyQueued += 1;
    }

    await spawnAgent(supabase, {
      agentType: 'coach',
      userId,
      payload: {
        source: 'hermes-planner',
        agentType: 'prelims',
        userContext: weak && weak.length > 0
          ? `Recent weak topic: ${weak[0].gap_type} (severity ${weak[0].severity})`
          : 'No recent weak areas detected.',
        userAction: 'morning_nudge',
      },
    });
    coachQueued += 1;
  }

  return { usersConsidered: userIds.length, coachQueued, studyQueued };
}

export async function runHermesResearchSweep(supabase: SupabaseClient): Promise<{
  sourcesQueued: number;
}> {
  let queued = 0;
  for (const source of SOURCE_REGISTRY) {
    if (!source.enabled) continue;
    await spawnAgent(supabase, {
      agentType: 'research',
      payload: {
        source: 'hermes-research-sweep',
        sourceId: source.id,
        sourceName: source.name,
      },
    });
    queued += 1;
  }
  return { sourcesQueued: queued };
}

export async function runHermesContentSweep(supabase: SupabaseClient): Promise<{
  topicsQueued: number;
}> {
  const staleCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: topics } = await supabase
    .from('topics')
    .select('id, syllabus_tag, content, updated_at')
    .or(`content.is.null,updated_at.lt.${staleCutoff}`)
    .limit(50);

  let queued = 0;
  for (const topic of topics || []) {
    await spawnAgent(supabase, {
      agentType: 'content',
      payload: {
        source: 'hermes-content-sweep',
        topicId: topic.id,
        syllabusTag: topic.syllabus_tag,
        reason: topic.content ? 'stale' : 'missing',
      },
    });
    queued += 1;
  }
  return { topicsQueued: queued };
}

export interface HermesStatus {
  queues: Awaited<ReturnType<typeof getQueueDepths>>;
  lastSweeps: {
    planner: string | null;
    researchSweep: string | null;
    contentSweep: string | null;
  };
  activeWorkers: number;
}

export async function getHermesStatus(supabase: SupabaseClient): Promise<HermesStatus> {
  const queues = await getQueueDepths();

  const sweepName = async (name: string): Promise<string | null> => {
    const { data } = await supabase
      .from('job_logs')
      .select('created_at')
      .eq('agent_type', name)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as any)?.created_at ?? null;
  };

  const [planner, researchSweep, contentSweep] = await Promise.all([
    sweepName('hermes-planner'),
    sweepName('hermes-research-sweep'),
    sweepName('hermes-content-sweep'),
  ]);

  const activeWorkers = Object.values(queues).reduce((acc, q) => acc + (q?.active ?? 0), 0);

  return {
    queues,
    lastSweeps: { planner, researchSweep, contentSweep },
    activeWorkers,
  };
}
