// prepx — Core Types (MVP v1)

export type Subject =
  | 'polity'
  | 'history'
  | 'world-history'
  | 'geography'
  | 'physical-geography'
  | 'society'
  | 'governance'
  | 'international-relations'
  | 'social-justice'
  | 'economy'
  | 'agriculture'
  | 'science-technology'
  | 'environment'
  | 'disaster-management'
  | 'internal-security'
  | 'ethics-aptitude'
  | 'csat-comprehension'
  | 'csat-logical'
  | 'csat-quantitative'
  | 'csat-decision';

export type SubscriptionStatus = 'free' | 'premium' | 'premium_plus';
export type UserRole = 'aspirant' | 'admin' | 'moderator';

export type PlanStatus = 'pending' | 'in_progress' | 'completed';

export type GapType = 'silly' | 'concept' | 'time';

export type QuizTask = {
  topic_id: string | null;
  type: 'read' | 'quiz' | 'review' | 'ca_bundle';
  duration: number; // minutes
  status: PlanStatus;
  bundle_id?: string;
};

export type TopicContent = {
  definitions: string[];
  key_concepts: { title: string; body: string }[];
  pyqs: { year: number; question: string; answer: string }[];
  common_traps: string[];
  summary: string;
  source_url: string;
  mnemonic?: string;
  mindmap?: string;
};

export type Question = {
  id: string;
  question: string;
  options: string[];
  correct_option: string;
  explanation?: string;
};

export type ErrorBreakdown = {
  silly: number;
  concept: number;
  time: number;
};

export type UserProfile = {
  id: string;
  email: string;
  subscription_status: SubscriptionStatus;
  role?: UserRole;
  baseline_score?: number;
  weak_areas: string[];
  streak_count: number;
};

export type DailyPlan = {
  id: string;
  user_id: string;
  plan_date: string;
  tasks: QuizTask[];
  status: PlanStatus;
};

export type Topic = {
  id: string;
  title: string;
  subject: Subject;
  syllabus_tag: string;
  content: TopicContent;
  readability_score?: number;
  source_url?: string;
};

export type Quiz = {
  id: string;
  topic_id: string;
  questions: Question[];
};

export type QuizAttempt = {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  answers: Record<string, string>;
  error_breakdown: ErrorBreakdown;
  diagnosis?: string;
  created_at?: string;
};

export type WeakArea = {
  id: string;
  user_id: string;
  topic_id: string;
  gap_type: GapType;
  severity: number;
  detected_at: string;
  auto_injected_at?: string;
};

export type AgentState = 'idle' | 'planning' | 'ready' | 'studying' | 'quizzing' | 'feedback' | 'adapting' | 'done';

export type UserSession = {
  user_id: string;
  session_state: AgentState;
  current_topic_id?: string;
  current_quiz_id?: string;
  daily_plan_id?: string;
  last_activity_at: string;
  readiness_score: number;
  created_at: string;
  updated_at: string;
};

export type AgentTask = {
  id: string;
  user_id: string;
  agent_type: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  attempt_count: number;
  created_at: string;
  completed_at?: string;
};

export type GuideAgent = {
  name: string;
  role: string;
  coach: (session: UserSession, context: string) => Promise<string>;
  researchDaily: (date: string) => Promise<string>;
};

export type EvalScore = {
  structure: number;
  content: number;
  analysis: number;
  presentation: number;
  total: number;
  feedback: string;
};

export type ProgressionLevel = 1 | 2 | 3 | 4 | 5;

export type ReadinessReport = {
  user_id: string;
  score: number;
  level: ProgressionLevel;
  strengths: string[];
  weaknesses: string[];
  trend: 'up' | 'down' | 'stable';
  estimated_days_to_ready: number;
};
