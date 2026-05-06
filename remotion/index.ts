// Sprint 9-C — Remotion entry root. Two compositions registered:
//
//   ClassroomLecture  — legacy minimal composition (kept for backward compat
//                       with anything that still references that ID).
//   EducationalLecture — the canonical Sprint 9-C composition. Consumes a
//                        full EducationalBundleInput via inputProps.
//
// Both register with calculateMetadata so duration/fps/dimensions are
// derived from inputProps (the bundle). The defaultProps are placeholder
// values used only when previewing without inputs.

import { registerRoot, Composition } from 'remotion';
import React from 'react';
import { ClassroomLecture } from './compositions/ClassroomLecture';
import { EducationalLecture } from './compositions/EducationalLecture';
import type { EducationalBundleInput } from './schema/bundle';

const LEGACY_DEFAULT_PROPS = {
  title: 'UPSC Lecture',
  markers: [] as Array<{ id: string; timestamp: number; title: string; visual_cue: string }>,
  background: '#0f172a',
};

const EDU_PLACEHOLDER_BUNDLE: EducationalBundleInput = {
  timeline: {
    topic: 'preview',
    title: 'Preview',
    duration: 30,
    scenes: [
      { position: 0, start: 0, end: 3, type: 'intro', description: 'preview-intro' },
      { position: 1, start: 3, end: 27, type: 'board', description: 'preview-board' },
      { position: 2, start: 27, end: 30, type: 'outro', description: 'preview-outro' },
    ],
    noteMarkers: [{ id: 1, timestamp: 5, text: 'Sample note marker.' }],
    quizMarkers: [],
  },
  metadata: { topic: { slug: 'preview', title: 'Preview' } },
  notes: {
    title: 'Preview',
    summary: 'Preview composition.',
    key_points: ['Point 1', 'Point 2', 'Point 3', 'Point 4', 'Point 5'],
    formula_sheet: [{ name: 'Sample', expression: 'a = b + c', where: { a: 'a', b: 'b', c: 'c' } }],
    real_world_analogies: ['Analogy 1'],
    common_mistakes: ['Mistake 1'],
    exam_relevance: 'Exam relevance text.',
  },
  quiz: {
    topic: 'preview',
    mcq: [
      {
        id: 1,
        question: 'Sample question?',
        options: ['A', 'B', 'C', 'D'],
        correct_index: 0,
        explanation: 'Because A.',
        concept: 'sample',
        difficulty: 'easy',
      },
    ],
    conceptual: [
      {
        id: 1,
        question: 'Sample conceptual?',
        model_answer: 'A reasonably long model answer that meets the 30-character minimum requirement.',
        concept: 'sample',
      },
    ],
  },
};

const FPS = 30;
const WIDTH = 1280;
const HEIGHT = 720;

// EducationalLecture's total length = timeline.duration + recap(8) + quizzes(7×N) + outro(4).
function calcEducationalDuration(bundle: EducationalBundleInput): number {
  const tl = bundle.timeline.duration;
  const recap = 8;
  const quiz = (bundle.quiz?.mcq?.length || 0) * 7;
  const outro = 4;
  return Math.max(1, Math.ceil((tl + recap + quiz + outro) * FPS));
}

function RemotionRoot() {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(Composition, {
      key: 'ClassroomLecture',
      id: 'ClassroomLecture',
      component: ClassroomLecture as any,
      durationInFrames: 30 * 24 * 60,
      fps: 24,
      width: 1280,
      height: 720,
      defaultProps: LEGACY_DEFAULT_PROPS as any,
    }),
    React.createElement(Composition, {
      key: 'EducationalLecture',
      id: 'EducationalLecture',
      component: EducationalLecture as any,
      fps: FPS,
      width: WIDTH,
      height: HEIGHT,
      durationInFrames: calcEducationalDuration(EDU_PLACEHOLDER_BUNDLE),
      defaultProps: { bundle: EDU_PLACEHOLDER_BUNDLE } as any,
      calculateMetadata: async ({ props }: { props: { bundle: EducationalBundleInput } }) => {
        return {
          durationInFrames: calcEducationalDuration(props.bundle),
          fps: FPS,
          width: WIDTH,
          height: HEIGHT,
        };
      },
    })
  );
}

export { ClassroomLecture, EducationalLecture };
registerRoot(RemotionRoot);
