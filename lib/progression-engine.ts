export type ProgressionLevel = 1 | 2 | 3 | 4 | 5;

export interface SubtopicProgress {
  gs: string;
  subtopic: string;
  attempts: number;
  avgScore: number;
  currentLevel: ProgressionLevel;
  trend: 'improving' | 'stagnant' | 'declining';
}

export function computeLevel(avgScore: number): ProgressionLevel {
  if (avgScore >= 7) return 5;
  if (avgScore >= 6) return 4;
  if (avgScore >= 5) return 3;
  if (avgScore >= 4) return 2;
  return 1;
}

export function computeTrend(scores: number[]): 'improving' | 'stagnant' | 'declining' {
  if (scores.length < 3) return 'stagnant';
  const first = scores[0];
  const last = scores[scores.length - 1];
  const monotonicUp = scores.every((v, i) => i === 0 || v >= scores[i - 1]);
  const monotonicDown = scores.every((v, i) => i === 0 || v <= scores[i - 1]);
  if (monotonicUp) return 'improving';
  if (monotonicDown) return 'declining';
  if (Math.abs(last - first) <= 0.5) return 'stagnant';
  return last > first ? 'improving' : 'declining';
}

export function readinessScore(progress: SubtopicProgress[]): number {
  if (progress.length === 0) return 0;
  const avg = progress.reduce((s, p) => s + p.avgScore, 0) / progress.length;
  const coverage = progress.filter(p => p.attempts >= 1).length / progress.length;
  const consistency = progress.filter(p => p.attempts >= 3).length / progress.length;
  return Math.round((avg * 4 + coverage * 2 + consistency * 2 + (avg > 5 ? 2 : 0)) * 10);
}
