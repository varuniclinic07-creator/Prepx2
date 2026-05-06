import React from 'react';

// Renders a single formula card. The label list (sym → meaning) is shown
// underneath in a 2-column grid. Visible during board scenes.
export const FormulaOverlay: React.FC<{
  expression: string;
  where: Record<string, string>;
  opacity?: number;
}> = ({ expression, where, opacity = 1 }) => {
  const entries = Object.entries(where).slice(0, 4);
  return (
    <div
      style={{
        marginTop: 24,
        padding: '20px 28px',
        backgroundColor: '#0f172a',
        borderRadius: 14,
        borderLeft: '4px solid #38bdf8',
        opacity,
      }}
    >
      <div
        style={{
          color: '#7dd3fc',
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}
      >
        Formula
      </div>
      <div
        style={{
          color: '#f8fafc',
          fontSize: 56,
          fontWeight: 700,
          marginTop: 8,
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        }}
      >
        {expression}
      </div>
      {entries.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px 24px',
            marginTop: 16,
          }}
        >
          {entries.map(([sym, meaning]) => (
            <div key={sym} style={{ color: '#cbd5e1', fontSize: 20 }}>
              <span style={{ color: '#38bdf8', fontWeight: 700, marginRight: 8 }}>{sym}</span>
              {meaning}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
