import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from 'remotion';

interface ClassroomLectureProps {
  title: string;
  markers: Array<{ timestamp: number; title: string; visual_cue: string }>;
  background?: string;
}

export const ClassroomLecture: React.FC<ClassroomLectureProps> = ({
  title,
  markers,
  background = '#0f172a',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const currentTime = frame / fps;
  const currentMarker = markers
    .filter(m => m.timestamp <= currentTime)
    .slice(-1)[0];

  const contentOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: background, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Board */}
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
          transform: `scale(${titleSpring})`,
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}
      >
        <h1
          style={{
            color: '#f1f5f9',
            fontSize: 52,
            fontWeight: 700,
            margin: 0,
            opacity: contentOpacity,
          }}
        >
          {title}
        </h1>
        {currentMarker && (
          <div
            style={{
              marginTop: 32,
              padding: '24px 32px',
              backgroundColor: '#0f172a',
              borderRadius: 12,
              borderLeft: '4px solid #38bdf8',
              opacity: contentOpacity,
            }}
          >
            <p style={{ color: '#94a3b8', fontSize: 20, margin: 0, marginBottom: 8 }}>
              {currentMarker.title}
            </p>
            <p style={{ color: '#e2e8f0', fontSize: 28, margin: 0, lineHeight: 1.5 }}>
              {currentMarker.visual_cue}
            </p>
          </div>
        )}
        {!currentMarker && markers.length === 0 && (
          <div style={{ marginTop: 32, opacity: contentOpacity }}>
            <p style={{ color: '#94a3b8', fontSize: 24, margin: 0 }}>
              Interactive classroom lecture — Remotion + ComfyUI + LTX 2.3
            </p>
          </div>
        )}
      </div>

      {/* Progress bar */}
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
            width: `${(currentTime / (markers.length > 0 ? markers[markers.length - 1].timestamp : 1800)) * 100}%`,
            backgroundColor: '#38bdf8',
            borderRadius: 2,
            maxWidth: '100%',
          }}
        />
      </div>

      {/* Teacher avatar area */}
      <div
        style={{
          position: 'absolute',
          bottom: '3%',
          right: '5%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: '#38bdf8',
          fontSize: 18,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#1e3a5f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
          }}
        >
          AI
        </div>
        PrepX AI Teacher
      </div>
    </AbsoluteFill>
  );
};
