import React from 'react';

// Renders learning objectives as a numbered list. Used inside IntroScene
// and RecapScene to anchor the lesson goals.
export const ObjectiveOverlay: React.FC<{ objectives: string[]; opacity?: number }> = ({
  objectives,
  opacity = 1,
}) => {
  if (!objectives || objectives.length === 0) return null;
  return (
    <div
      style={{
        marginTop: 24,
        opacity,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          color: '#a5f3fc',
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}
      >
        You will learn
      </div>
      {objectives.slice(0, 4).map((o, i) => (
        <div
          key={i}
          style={{
            color: '#e2e8f0',
            fontSize: 24,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            lineHeight: 1.4,
          }}
        >
          <span
            style={{
              minWidth: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: '#38bdf8',
              color: '#0f172a',
              fontSize: 16,
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {i + 1}
          </span>
          <span style={{ flex: 1 }}>{o}</span>
        </div>
      ))}
    </div>
  );
};
