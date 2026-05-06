// Sprint 9-C — Canonical Remotion composition for an educational lecture.
// Consumes a fully-resolved EducationalBundleInput (built by render.ts from
// the same timeline.json + metadata.json + notes.json + quiz.json the
// ffmpeg path uses) and orchestrates 5 scene kinds:
//
//   IntroScene   (driven by metadata.topic + objectives)
//   BoardScene   (driven by timeline.scenes[type=formula|board|comfy] + noteMarkers)
//   RecapScene   (synthetic — appended after the last timeline scene)
//   QuizScene    (synthetic — one per quiz.mcq, after recap)
//   OutroScene   (terminal)
//
// Order is fixed: original timeline ⟶ recap ⟶ quizzes ⟶ outro.
// Recap+quizzes+outro extend the composition past timeline.duration; this
// is intentional — Remotion gets to add semantic scenes ffmpeg can't.

import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { Background } from '../layers/Background';
import { ProgressBar } from '../overlays/ProgressBar';
import { ConceptLabel } from '../overlays/ConceptLabel';
import { SubtitleLayer } from '../overlays/SubtitleLayer';
import { IntroScene } from '../scenes/IntroScene';
import { BoardScene } from '../scenes/BoardScene';
import { RecapScene } from '../scenes/RecapScene';
import { QuizScene } from '../scenes/QuizScene';
import { OutroScene } from '../scenes/OutroScene';
import { secondsToFrames } from '../utils/frames';
import type { EducationalBundleInput, SceneInput } from '../schema/bundle';

export interface EducationalLectureProps {
  bundle: EducationalBundleInput;
  // Per-quiz duration in seconds. Total render = timeline.duration +
  // recapSeconds + (quiz.mcq.length × quizSeconds) + outroSeconds.
  recapSeconds?: number;
  quizSeconds?: number;
  outroSeconds?: number;
}

const DEFAULT_RECAP_SEC = 8;
const DEFAULT_QUIZ_SEC = 7;
const DEFAULT_OUTRO_SEC = 4;

function pickSceneType(s: SceneInput): 'intro' | 'board' | 'outro' {
  if (s.type === 'intro') return 'intro';
  if (s.type === 'outro') return 'outro';
  // formula / board / comfy / recap / quiz all share the board chrome
  return 'board';
}

function activeNoteConcept(
  notes: EducationalBundleInput['notes'],
  bundle: EducationalBundleInput,
  currentSec: number
): string {
  // For now: title of the lesson is the universal concept label. Day-2
  // could resolve a per-noteMarker concept once the marker schema gains a
  // `concept_id` field.
  return notes.title || bundle.timeline.title || bundle.timeline.topic;
}

export const EducationalLecture: React.FC<EducationalLectureProps> = ({
  bundle,
  recapSeconds = DEFAULT_RECAP_SEC,
  quizSeconds = DEFAULT_QUIZ_SEC,
  outroSeconds = DEFAULT_OUTRO_SEC,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const { timeline, notes, quiz } = bundle;

  const formula = bundle.metadata?.topic?.formula
    ? {
        expression: bundle.metadata.topic.formula,
        where: notes.formula_sheet?.[0]?.where || {},
      }
    : notes.formula_sheet?.[0]
    ? {
        expression: notes.formula_sheet[0].expression,
        where: notes.formula_sheet[0].where,
      }
    : undefined;

  const objectives =
    bundle.concept?.learning_objectives ||
    [
      // Synthesise objectives from key_points when extraction-side ones aren't
      // present (lecture jobs). Top 3-4 key_points become "you will learn …".
      ...(notes.key_points || []).slice(0, 4),
    ];

  // Build the segment list. Each segment has a frame range; Remotion's
  // <Sequence from durationInFrames> mounts/unmounts the scene component.
  type Segment =
    | { kind: 'intro'; from: number; durationFrames: number; scene: SceneInput }
    | { kind: 'board'; from: number; durationFrames: number; scene: SceneInput }
    | { kind: 'outro-shot'; from: number; durationFrames: number; scene: SceneInput }
    | { kind: 'recap'; from: number; durationFrames: number }
    | { kind: 'quiz'; from: number; durationFrames: number; mcqIndex: number }
    | { kind: 'outro-final'; from: number; durationFrames: number };

  const segments: Segment[] = [];

  for (const s of timeline.scenes) {
    const from = secondsToFrames(s.start, fps);
    const dur = Math.max(1, secondsToFrames(s.end - s.start, fps));
    const kind = pickSceneType(s);
    if (kind === 'intro') segments.push({ kind: 'intro', from, durationFrames: dur, scene: s });
    else if (kind === 'outro') segments.push({ kind: 'outro-shot', from, durationFrames: dur, scene: s });
    else segments.push({ kind: 'board', from, durationFrames: dur, scene: s });
  }

  // Append recap → quizzes → outro AFTER the last timeline scene.
  let cursor = secondsToFrames(timeline.duration, fps);
  segments.push({
    kind: 'recap',
    from: cursor,
    durationFrames: secondsToFrames(recapSeconds, fps),
  });
  cursor += secondsToFrames(recapSeconds, fps);

  quiz.mcq.forEach((_, i) => {
    segments.push({
      kind: 'quiz',
      from: cursor,
      durationFrames: secondsToFrames(quizSeconds, fps),
      mcqIndex: i,
    });
    cursor += secondsToFrames(quizSeconds, fps);
  });

  segments.push({
    kind: 'outro-final',
    from: cursor,
    durationFrames: secondsToFrames(outroSeconds, fps),
  });

  // Active-second is computed for absolute-time-driven overlays (concept
  // label, subtitle, progress). We approximate currentSec from the latest
  // segment's from-offset; each scene also uses its own scene-local frame.
  const currentSec = (durationInFrames / fps) * 0; // overridden by sub-component reading useCurrentFrame
  void currentSec;

  return (
    <AbsoluteFill>
      <Background />

      {segments.map((seg, idx) => {
        const key = `${seg.kind}-${idx}`;
        if (seg.kind === 'intro') {
          return (
            <Sequence key={key} from={seg.from} durationInFrames={seg.durationFrames}>
              <IntroScene
                title={timeline.title}
                topic={timeline.topic.toUpperCase()}
                objectives={objectives}
                sceneStartFrame={seg.from}
              />
            </Sequence>
          );
        }
        if (seg.kind === 'board' || seg.kind === 'outro-shot') {
          return (
            <Sequence key={key} from={seg.from} durationInFrames={seg.durationFrames}>
              <BoardScene
                title={timeline.title}
                currentSec={seg.scene.start}
                noteMarkers={timeline.noteMarkers}
                formula={formula}
                sceneStartFrame={seg.from}
              />
            </Sequence>
          );
        }
        if (seg.kind === 'recap') {
          return (
            <Sequence key={key} from={seg.from} durationInFrames={seg.durationFrames}>
              <RecapScene keyPoints={notes.key_points || []} sceneStartFrame={seg.from} />
            </Sequence>
          );
        }
        if (seg.kind === 'quiz') {
          const mcq = quiz.mcq[seg.mcqIndex];
          return (
            <Sequence key={key} from={seg.from} durationInFrames={seg.durationFrames}>
              <QuizScene
                mcq={mcq}
                index={seg.mcqIndex}
                total={quiz.mcq.length}
                sceneStartFrame={seg.from}
                sceneDurationFrames={seg.durationFrames}
              />
            </Sequence>
          );
        }
        // outro-final
        return (
          <Sequence key={key} from={seg.from} durationInFrames={seg.durationFrames}>
            <OutroScene topic={timeline.title} sceneStartFrame={seg.from} />
          </Sequence>
        );
      })}

      {/* Persistent overlays — tracked against absolute frame */}
      <PersistentOverlays
        bundle={bundle}
        notes={notes}
        totalSec={cursor / fps + outroSeconds}
        activeNoteConcept={activeNoteConcept}
      />
    </AbsoluteFill>
  );
};

// Split out so the overlays can pull frame state via useCurrentFrame
// without re-mounting the whole composition tree.
const PersistentOverlays: React.FC<{
  bundle: EducationalBundleInput;
  notes: EducationalBundleInput['notes'];
  totalSec: number;
  activeNoteConcept: (
    notes: EducationalBundleInput['notes'],
    bundle: EducationalBundleInput,
    currentSec: number
  ) => string;
}> = ({ bundle, notes, totalSec, activeNoteConcept }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const totalFrames = durationInFrames;
  void totalFrames;

  // We can't call useCurrentFrame at the top of EducationalLecture because
  // sequences re-mount with their own frame; here we hook the OUTER frame.
  // Remotion exports useCurrentFrame from this scope too.
  const { useCurrentFrame } = require('remotion') as { useCurrentFrame: () => number };
  const frame = useCurrentFrame();
  const currentSec = frame / fps;

  const cues = bundle.subtitles || [];

  return (
    <>
      <ConceptLabel concept={activeNoteConcept(notes, bundle, currentSec)} />
      <SubtitleLayer cues={cues} currentSec={currentSec} />
      <ProgressBar currentSec={currentSec} totalSec={totalSec} />
    </>
  );
};
