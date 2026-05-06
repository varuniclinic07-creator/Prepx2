import React from 'react';
import { AbsoluteFill } from 'remotion';

// Educational dark theme (matches PrepX slate-950). Scenes paint on top.
export const Background: React.FC<{ color?: string }> = ({ color = '#0f172a' }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: color }}>
      {/* Subtle radial accent so flat color doesn't feel dead. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 20% 20%, rgba(56,189,248,0.08), transparent 40%), radial-gradient(circle at 80% 80%, rgba(16,185,129,0.06), transparent 40%)',
        }}
      />
    </AbsoluteFill>
  );
};
