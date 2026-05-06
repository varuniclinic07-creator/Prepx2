import React from 'react';

// Top-right corner badge naming the concept currently being taught. Driven
// by the active scene + (optionally) the closest noteMarker.
export const ConceptLabel: React.FC<{ concept: string }> = ({ concept }) => {
  if (!concept) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: '8%',
        right: '6%',
        padding: '8px 16px',
        backgroundColor: 'rgba(56,189,248,0.12)',
        border: '1px solid rgba(56,189,248,0.35)',
        borderRadius: 999,
        color: '#7dd3fc',
        fontSize: 16,
        fontWeight: 600,
        fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif',
        letterSpacing: 0.5,
      }}
    >
      {concept}
    </div>
  );
};
