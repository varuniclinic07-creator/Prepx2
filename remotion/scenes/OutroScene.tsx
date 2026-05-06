import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Board } from '../layers/Board';

export const OutroScene: React.FC<{ topic: string; sceneStartFrame: number }> = ({
  topic,
  sceneStartFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - sceneStartFrame;
  const fade = interpolate(local, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <Board opacity={fade}>
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <div style={{ color: '#7dd3fc', fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>
          NICE WORK
        </div>
        <div style={{ color: '#f8fafc', fontSize: 56, fontWeight: 800, marginTop: 16 }}>
          You completed {topic}
        </div>
        <div style={{ color: '#94a3b8', fontSize: 24, marginTop: 24 }}>
          PrepX · AI Education OS
        </div>
      </div>
    </Board>
  );
};
