export interface HeroLiveData {
  aspirants: number;
  topics: number;
  questionsToday: number;
  hermesActivity: Array<{ id: string; agent: string; summary: string; status: string }>;
  todayPlan: Array<{ topic_id: string; type: string; duration: number; status: string }> | null;
  astraPreview: { title: string; subject: string } | null;
}
