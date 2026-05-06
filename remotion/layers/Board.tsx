import React from 'react';

// The educational "board" — the primary content surface for board, recap, and
// quiz scenes. Sized at 90% width × 72% height, top-left at (5%, 5%).
export const Board: React.FC<{ children?: React.ReactNode; opacity?: number }> = ({
  children,
  opacity = 1,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '5%',
        left: '5%',
        width: '90%',
        height: '72%',
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: '48px 56px',
        boxSizing: 'border-box',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        color: '#f1f5f9',
        fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif',
        opacity,
      }}
    >
      {children}
    </div>
  );
};
