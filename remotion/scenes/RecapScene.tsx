import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Board } from '../layers/Board';

// "What you just learned" — pulls the first 3-5 key_points from notes.json.
// One line per beat, fading in sequentially.
export const RecapScene: React.FC<{
  keyPoints: string[];
  sceneStartFrame: number;
}> = ({ keyPoints, sceneStartFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - sceneStartFrame;
  const points = keyPoints.slice(0, 5);

  return (
    <Board>
      <div
        style={{
          color: '#fbbf24',
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        Recap
      </div>
      <h2 style={{ color: '#f8fafc', fontSize: 44, margin: '8px 0 24px 0' }}>
        Key takeaways
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {points.map((p, i) => {
          const start = i * fps * 0.6;
          const opacity = interpolate(local, [start, start + fps * 0.4], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 14,
                color: '#e2e8f0',
                fontSize: 24,
                opacity,
                lineHeight: 1.4,
              }}
            >
              <span
                style={{
                  minWidth: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: '#fbbf24',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: 18,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {i + 1}
              </span>
              <span style={{ flex: 1 }}>{p}</span>
            </div>
          );
        })}
      </div>
    </Board>
  );
};
