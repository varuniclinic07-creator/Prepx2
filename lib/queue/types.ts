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

export type QueueName =
  | 'study-jobs'
  | 'research-jobs'
  | 'content-jobs'
  | 'script-jobs'
  | 'render-jobs'
  | 'coach-jobs'
  | 'dead-letter';

export const ALL_QUEUE_NAMES: QueueName[] = [
  'study-jobs',
  'research-jobs',
  'content-jobs',
  'script-jobs',
  'render-jobs',
  'coach-jobs',
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
  | 'coach';

export const QUEUE_FOR_AGENT: Record<AgentType, QueueName> = {
  study:    'study-jobs',
  research: 'research-jobs',
  content:  'content-jobs',
  script:   'script-jobs',
  render:   'render-jobs',
  coach:    'coach-jobs',
};
