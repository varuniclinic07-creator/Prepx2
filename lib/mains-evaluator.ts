export interface MainsScores {
  structure: number;
  content: number;
  analysis: number;
  presentation: number;
  overall: number;
}

export function evaluateMainsAnswer(answer: string): MainsScores {
  // Heuristic baseline scorer (production: AI Router with rubric prompt)
  const wordCount = answer.trim().split(/\s+/).length;
  const hasIntro = /^(introduction|intro|the)\b/i.test(answer) || answer.includes('Introduction');
  const hasConclusion = /(conclusion|in conclusion|to conclude)\b/i.test(answer);
  const hasExamples = /\b(for example|e\.g\.|ARC|PIB|NITI|report)\b/i.test(answer);
  const hasAnalysis = /\b(however|therefore|because|consequently|on the other hand)\b/i.test(answer);

  const structure = Math.min(10, Math.max(4, (hasIntro ? 3 : 0) + (hasConclusion ? 3 : 0) + (wordCount > 150 ? 4 : wordCount > 100 ? 3 : 2)));
  const content = Math.min(10, Math.max(3, Math.floor(wordCount / 40) + (hasExamples ? 3 : 0)));
  const analysis = Math.min(10, Math.max(3, (hasAnalysis ? 5 : 2) + (wordCount > 200 ? 3 : 2)));
  const presentation = Math.min(10, Math.max(3, (wordCount > 120 ? 4 : 3) + (hasIntro ? 3 : 0)));
  const overall = Math.round((structure + content + analysis + presentation) / 4 * 10) / 10;

  return { structure, content, analysis, presentation, overall };
}
