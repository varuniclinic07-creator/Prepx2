import { BaseSubjectTeacher, SubjectTeacher } from './subject-teacher';

class PolityTeacher extends BaseSubjectTeacher { id = 'polity'; subject = 'polity'; displayName = 'Polity'; syllabusPrefix = 'GS2-POL'; gsPaper = 2; totalTopics = 20; }
class HistoryTeacher extends BaseSubjectTeacher { id = 'history'; subject = 'history'; displayName = 'Indian History'; syllabusPrefix = 'GS1-HIS'; gsPaper = 1; totalTopics = 12; }
class WorldHistoryTeacher extends BaseSubjectTeacher { id = 'world-history'; subject = 'world-history'; displayName = 'World History'; syllabusPrefix = 'GS1-WLD'; gsPaper = 1; totalTopics = 8; }
class GeographyTeacher extends BaseSubjectTeacher { id = 'geography'; subject = 'geography'; displayName = 'Geography'; syllabusPrefix = 'GS1-GEO'; gsPaper = 1; totalTopics = 10; }
class PhysicalGeographyTeacher extends BaseSubjectTeacher { id = 'physical-geography'; subject = 'physical-geography'; displayName = 'Physical Geography'; syllabusPrefix = 'GS1-PHY'; gsPaper = 1; totalTopics = 8; }
class SocietyTeacher extends BaseSubjectTeacher { id = 'society'; subject = 'society'; displayName = 'Society & Social Issues'; syllabusPrefix = 'GS1-SOC'; gsPaper = 1; totalTopics = 8; }
class GovernanceTeacher extends BaseSubjectTeacher { id = 'governance'; subject = 'governance'; displayName = 'Governance'; syllabusPrefix = 'GS2-GOV'; gsPaper = 2; totalTopics = 8; }
class InternationalRelationsTeacher extends BaseSubjectTeacher { id = 'international-relations'; subject = 'international-relations'; displayName = 'International Relations'; syllabusPrefix = 'GS2-IR'; gsPaper = 2; totalTopics = 8; }
class SocialJusticeTeacher extends BaseSubjectTeacher { id = 'social-justice'; subject = 'social-justice'; displayName = 'Social Justice'; syllabusPrefix = 'GS2-SJ'; gsPaper = 2; totalTopics = 6; }
class EconomyTeacher extends BaseSubjectTeacher { id = 'economy'; subject = 'economy'; displayName = 'Indian Economy'; syllabusPrefix = 'GS3-ECO'; gsPaper = 3; totalTopics = 12; }
class AgricultureTeacher extends BaseSubjectTeacher { id = 'agriculture'; subject = 'agriculture'; displayName = 'Agriculture'; syllabusPrefix = 'GS3-AGR'; gsPaper = 3; totalTopics = 8; }
class ScienceTechTeacher extends BaseSubjectTeacher { id = 'science-technology'; subject = 'science-technology'; displayName = 'Science & Technology'; syllabusPrefix = 'GS3-SCI'; gsPaper = 3; totalTopics = 8; }
class EnvironmentTeacher extends BaseSubjectTeacher { id = 'environment'; subject = 'environment'; displayName = 'Environment & Ecology'; syllabusPrefix = 'GS3-ENV'; gsPaper = 3; totalTopics = 8; }
class DisasterManagementTeacher extends BaseSubjectTeacher { id = 'disaster-management'; subject = 'disaster-management'; displayName = 'Disaster Management'; syllabusPrefix = 'GS3-DM'; gsPaper = 3; totalTopics = 6; }
class InternalSecurityTeacher extends BaseSubjectTeacher { id = 'internal-security'; subject = 'internal-security'; displayName = 'Internal Security'; syllabusPrefix = 'GS3-IS'; gsPaper = 3; totalTopics = 6; }
class EthicsTeacher extends BaseSubjectTeacher { id = 'ethics-aptitude'; subject = 'ethics-aptitude'; displayName = 'Ethics, Integrity & Aptitude'; syllabusPrefix = 'GS4-ETH'; gsPaper = 4; totalTopics = 10; }
class CSATComprehensionTeacher extends BaseSubjectTeacher { id = 'csat-comprehension'; subject = 'csat-comprehension'; displayName = 'CSAT Comprehension'; syllabusPrefix = 'CSAT-COM'; gsPaper = 0; totalTopics = 6; }
class CSATLogicalTeacher extends BaseSubjectTeacher { id = 'csat-logical'; subject = 'csat-logical'; displayName = 'CSAT Logical Reasoning'; syllabusPrefix = 'CSAT-LR'; gsPaper = 0; totalTopics = 6; }
class CSATQuantitativeTeacher extends BaseSubjectTeacher { id = 'csat-quantitative'; subject = 'csat-quantitative'; displayName = 'CSAT Quantitative Aptitude'; syllabusPrefix = 'CSAT-QA'; gsPaper = 0; totalTopics = 6; }
class CSATDecisionTeacher extends BaseSubjectTeacher { id = 'csat-decision'; subject = 'csat-decision'; displayName = 'CSAT Decision Making'; syllabusPrefix = 'CSAT-DM'; gsPaper = 0; totalTopics = 4; }

export const ALL_SUBJECTS: SubjectTeacher[] = [
  new PolityTeacher(), new HistoryTeacher(), new WorldHistoryTeacher(),
  new GeographyTeacher(), new PhysicalGeographyTeacher(), new SocietyTeacher(),
  new GovernanceTeacher(), new InternationalRelationsTeacher(), new SocialJusticeTeacher(),
  new EconomyTeacher(), new AgricultureTeacher(), new ScienceTechTeacher(),
  new EnvironmentTeacher(), new DisasterManagementTeacher(), new InternalSecurityTeacher(),
  new EthicsTeacher(),
  new CSATComprehensionTeacher(), new CSATLogicalTeacher(), new CSATQuantitativeTeacher(), new CSATDecisionTeacher(),
];

export function getSubject(key: string): SubjectTeacher | undefined {
  return ALL_SUBJECTS.find(s => s.id === key || s.subject === key);
}
