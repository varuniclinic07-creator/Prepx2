export interface SubjectTeacher {
  readonly id: string;
  readonly subject: string;
  readonly displayName: string;
  readonly syllabusPrefix: string;
  readonly gsPaper: number;
  readonly systemPromptTemplate: string;
  readonly totalTopics: number;
  generateSyllabusTags(): string[];
}

export abstract class BaseSubjectTeacher implements SubjectTeacher {
  abstract readonly id: string;
  abstract readonly subject: string;
  abstract readonly displayName: string;
  abstract readonly syllabusPrefix: string;
  abstract readonly gsPaper: number;
  abstract readonly totalTopics: number;

  get systemPromptTemplate(): string {
    return `You are a UPSC ${this.displayName} expert. You create structured, exam-relevant study material for the ${this.displayName} section of GS Paper ${this.gsPaper}. Write for 10th-class readability. Focus on concepts, not rote memorization. Include definitions, key concepts, PYQs, common traps, and a concise summary.`;
  }

  generateSyllabusTags(): string[] {
    return Array.from({ length: this.totalTopics }, (_, i) =>
      `${this.syllabusPrefix}-L${String(i + 1).padStart(2, '0')}`
    );
  }
}
