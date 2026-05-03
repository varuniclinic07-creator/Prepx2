'use client';

import { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import ProgressRing from './ProgressRing';

// Sprint 4-3 — 3D Syllabus Navigator.
// Renders UPSC subjects as progress rings arranged in a 3D spherical layout.
// Click a subject to drill into its topics.

interface SubjectProgress {
  subject: string;
  label: string;
  totalTopics: number;
  masteredTopics: number;
  avgMastery: number;
  quizzesAttempted: number;
}

interface TopicProgress {
  id: string;
  title: string;
  subject: string;
  masteryLevel: number;
  quizzesAttempted: number;
}

const SUBJECT_LABELS: Record<string, string> = {
  polity: 'Polity',
  history: 'History',
  'world-history': 'World History',
  geography: 'Geography',
  'physical-geography': 'Physical Geog.',
  society: 'Society',
  governance: 'Governance',
  'international-relations': 'Intl. Relations',
  'social-justice': 'Social Justice',
  economy: 'Economy',
  agriculture: 'Agriculture',
  'science-technology': 'Sci & Tech',
  environment: 'Environment',
  'disaster-management': 'Disaster Mgmt',
  'internal-security': 'Internal Security',
  'ethics-aptitude': 'Ethics',
  'csat-comprehension': 'CSAT Comprehension',
  'csat-logical': 'CSAT Logical',
  'csat-quantitative': 'CSAT Quant',
  'csat-decision': 'CSAT Decision',
};

const SUBJECT_COLORS: Record<string, string> = {
  polity: '#22d3ee',
  history: '#f59e0b',
  'world-history': '#d946ef',
  geography: '#22c55e',
  'physical-geography': '#10b981',
  society: '#fbbf24',
  governance: '#a78bfa',
  'international-relations': '#38bdf8',
  'social-justice': '#f472b6',
  economy: '#34d399',
  agriculture: '#84cc16',
  'science-technology': '#2dd4bf',
  environment: '#4ade80',
  'disaster-management': '#fb923c',
  'internal-security': '#f87171',
  'ethics-aptitude': '#c084fc',
  'csat-comprehension': '#60a5fa',
  'csat-logical': '#818cf8',
  'csat-quantitative': '#e879f9',
  'csat-decision': '#fb7185',
};

function arrangeOnSphere(count: number, radius: number): [number, number, number][] {
  const points: [number, number, number][] = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const theta = phi * i;
    points.push([
      Math.cos(theta) * rad * radius,
      y * radius,
      Math.sin(theta) * rad * radius,
    ]);
  }
  return points;
}

function SubjectRings({
  subjects,
  onSelect,
}: {
  subjects: SubjectProgress[];
  onSelect: (subject: string) => void;
}) {
  const [hoveredSubject, setHoveredSubject] = useState<string | null>(null);
  const positions = arrangeOnSphere(subjects.length, 4);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 7]} intensity={1.0} />
      <pointLight position={[-5, 3, -5]} intensity={0.4} color="#22d3ee" />

      <Suspense fallback={null}>
        {subjects.map((s, i) => (
          <ProgressRing
            key={s.subject}
            progress={s.avgMastery}
            color={SUBJECT_COLORS[s.subject] || '#10b981'}
            label={SUBJECT_LABELS[s.subject] || s.subject}
            radius={0.65}
            tubeRadius={0.06}
            position={positions[i]}
            isHovered={hoveredSubject === s.subject}
            onHover={(h) => setHoveredSubject(h ? s.subject : null)}
            onClick={() => onSelect(s.subject)}
          />
        ))}
      </Suspense>
    </>
  );
}

export interface SyllabusNavigator3DProps {
  subjects: SubjectProgress[];
  topics: TopicProgress[];
  className?: string;
  onSelectTopic?: (topicId: string) => void;
}

export default function SyllabusNavigator3D({
  subjects,
  className,
  onSelectTopic,
}: SyllabusNavigator3DProps) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const handleSelectSubject = useCallback((subject: string) => {
    setSelectedSubject((prev) => (prev === subject ? null : subject));
  }, []);

  const filteredSubjects = selectedSubject
    ? subjects.filter((s) => s.subject === selectedSubject)
    : subjects;

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 1.5, 8], fov: 50 }}
        style={{ background: '#020617', borderRadius: 16 }}
        dpr={[1, 2]}
      >
        <SubjectRings subjects={filteredSubjects} onSelect={handleSelectSubject} />
        <OrbitControls enableDamping dampingFactor={0.08} />
      </Canvas>

      {/* Legend overlay */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          top: 16,
          background: 'rgba(2, 6, 23, 0.75)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: 10,
          padding: '8px 12px',
          color: '#94a3b8',
          fontSize: 11,
          backdropFilter: 'blur(6px)',
        }}
      >
        <div className="font-semibold text-slate-300 mb-1">UPSC Syllabus</div>
        <div>{subjects.length} subjects · Click to filter</div>
        {selectedSubject && (
          <button
            className="mt-1 text-cyan-400 hover:underline text-xs"
            onClick={() => setSelectedSubject(null)}
          >
            Show all
          </button>
        )}
      </div>
    </div>
  );
}
