import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Board } from '../layers/Board';
import type { McqInput } from '../schema/bundle';

// Renders ONE MCQ at a time with the 4 options. Highlights the correct
// answer in the back half of the scene so this doubles as quick recall.
export const QuizScene: React.FC<{
  mcq: McqInput;
  index: number;
  total: number;
  sceneStartFrame: number;
  sceneDurationFrames: number;
}> = ({ mcq, index, total, sceneStartFrame, sceneDurationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - sceneStartFrame;
  const revealAt = sceneDurationFrames * 0.55;
  const fade = interpolate(local, [0, fps * 0.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Board opacity={fade}>
      <div
        style={{
          color: '#f472b6',
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        Quick Check · {index + 1} / {total}
      </div>
      <h2
        style={{
          color: '#f8fafc',
          fontSize: 32,
          fontWeight: 700,
          margin: '12px 0 18px 0',
          lineHeight: 1.3,
        }}
      >
        {mcq.question}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mcq.options.map((opt, i) => {
          const isCorrect = i === mcq.correct_index;
          const reveal = local >= revealAt;
          const bg = reveal && isCorrect ? '#065f46' : '#0f172a';
          const border = reveal && isCorrect ? '#34d399' : '#334155';
          return (
            <div
              key={i}
              style={{
                padding: '12px 18px',
                backgroundColor: bg,
                border: `2px solid ${border}`,
                borderRadius: 10,
                color: '#e2e8f0',
                fontSize: 22,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  minWidth: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: reveal && isCorrect ? '#34d399' : '#1e293b',
                  color: reveal && isCorrect ? '#0f172a' : '#94a3b8',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                }}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span style={{ flex: 1 }}>{opt}</span>
            </div>
          );
        })}
      </div>
    </Board>
  );
};
