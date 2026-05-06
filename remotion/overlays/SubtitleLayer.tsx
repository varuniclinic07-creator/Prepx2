import React from 'react';
import type { SrtCue } from '../utils/srt';

// Bottom-aligned subtitle band. Picks the cue whose [start,end] covers the
// current absolute time. Renders nothing outside cue ranges.
export const SubtitleLayer: React.FC<{ cues: SrtCue[]; currentSec: number }> = ({
  cues,
  currentSec,
}) => {
  const active = cues.find((c) => currentSec >= c.startSec && currentSec <= c.endSec);
  if (!active) return null;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '8%',
        left: '12%',
        width: '76%',
        textAlign: 'center',
        padding: '12px 20px',
        backgroundColor: 'rgba(15,23,42,0.78)',
        borderRadius: 10,
        color: '#f8fafc',
        fontSize: 28,
        fontWeight: 600,
        lineHeight: 1.35,
        fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif',
        textShadow: '0 2px 4px rgba(0,0,0,0.6)',
      }}
    >
      {active.text}
    </div>
  );
};
