import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Board } from '../layers/Board';
import { FormulaOverlay } from '../overlays/FormulaOverlay';

// The "main board" while the topic is being explained. Picks the
// noteMarker active at the current absolute time and renders it as the
// board headline. The formula card sits underneath if a formula is given.
export const BoardScene: React.FC<{
  title: string;
  currentSec: number;
  noteMarkers: Array<{ id: number | string; timestamp: number; text: string }>;
  formula?: { expression: string; where: Record<string, string> };
  sceneStartFrame: number;
}> = ({ title, currentSec, noteMarkers, formula, sceneStartFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - sceneStartFrame;
  const fade = interpolate(local, [0, fps * 0.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Last marker whose timestamp ≤ currentSec.
  const active = noteMarkers
    .filter((n) => n.timestamp <= currentSec)
    .slice(-1)[0];

  return (
    <Board opacity={fade}>
      <h2
        style={{
          color: '#f1f5f9',
          fontSize: 40,
          fontWeight: 700,
          margin: 0,
          marginBottom: 20,
        }}
      >
        {title}
      </h2>

      {active ? (
        <div
          style={{
            padding: '20px 28px',
            backgroundColor: '#0f172a',
            borderRadius: 12,
            borderLeft: '4px solid #34d399',
            color: '#e2e8f0',
            fontSize: 26,
            lineHeight: 1.45,
            fontWeight: 500,
          }}
        >
          {active.text}
        </div>
      ) : (
        <div style={{ color: '#94a3b8', fontSize: 24 }}>
          Working through the explanation…
        </div>
      )}

      {formula && formula.expression && (
        <FormulaOverlay expression={formula.expression} where={formula.where} />
      )}
    </Board>
  );
};
