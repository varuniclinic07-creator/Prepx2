import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { Board } from '../layers/Board';
import { ObjectiveOverlay } from '../overlays/ObjectiveOverlay';

// Opens the lecture: title fade-in + objectives. Driven by a spring on the
// scene-local frame so it's the same animation regardless of when the
// scene starts on the global timeline.
export const IntroScene: React.FC<{
  title: string;
  topic: string;
  objectives: string[];
  sceneStartFrame: number;
}> = ({ title, topic, objectives, sceneStartFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - sceneStartFrame;

  const titlePop = spring({ frame: local, fps, config: { damping: 12, stiffness: 100 } });
  const objOpacity = interpolate(local, [fps * 0.6, fps * 1.2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Board>
      <div
        style={{
          color: '#7dd3fc',
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        {topic}
      </div>
      <h1
        style={{
          color: '#f8fafc',
          fontSize: 64,
          fontWeight: 800,
          lineHeight: 1.1,
          margin: '12px 0 0 0',
          transform: `scale(${titlePop})`,
          transformOrigin: 'left center',
        }}
      >
        {title}
      </h1>
      <ObjectiveOverlay objectives={objectives} opacity={objOpacity} />
    </Board>
  );
};
