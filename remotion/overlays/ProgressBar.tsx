import React from 'react';

// Bottom-of-frame progress bar driven by absolute time vs total duration.
export const ProgressBar: React.FC<{ currentSec: number; totalSec: number }> = ({
  currentSec,
  totalSec,
}) => {
  const pct = totalSec > 0 ? Math.min(100, (currentSec / totalSec) * 100) : 0;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '18%',
        left: '5%',
        width: '90%',
        height: 4,
        backgroundColor: '#334155',
        borderRadius: 2,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          backgroundColor: '#38bdf8',
          borderRadius: 2,
          transition: 'none',
        }}
      />
    </div>
  );
};
