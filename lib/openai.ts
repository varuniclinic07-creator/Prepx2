// Legacy re-export — all AI calls route through ai-router.ts (multi-tier fallback)
export { aiChat, generateQuiz, classifyError, generateDiagnosis, generateContentSummary, embedText, textToSpeech } from './ai-router';
