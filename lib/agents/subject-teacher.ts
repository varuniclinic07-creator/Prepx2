export class BaseSubjectTeacher {
  id = '';
  subject = '';
  displayName = '';
  syllabusPrefix = '';
  gsPaper = 0;
  totalTopics = 0;
}

export interface SubjectTeacher {
  id: string;
  subject: string;
  displayName: string;
  syllabusPrefix: string;
  gsPaper: number;
  totalTopics: number;
}
