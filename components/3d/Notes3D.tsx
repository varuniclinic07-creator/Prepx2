'use client';

// Sprint 6 S6-2: 3D notes surface. Notes themselves are RoundedBox cards
// floating in R3F space — NOT a 2D textarea inside a 3D widget. drei <Text>
// renders the note content in 3D, drei <Html> overlays an editor on click.

import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, RoundedBox, Text, Html } from '@react-three/drei';
import * as THREE from 'three';

export type NoteColor =
  | 'primary' | 'cyan' | 'saffron' | 'success'
  | 'warning' | 'muted'   | 'magenta' | 'gold';

const COLOR_HEX: Record<NoteColor, string> = {
  primary: '#6366f1',
  cyan:    '#22d3ee',
  saffron: '#f97316',
  success: '#10b981',
  warning: '#f59e0b',
  muted:   '#64748b',
  magenta: '#d946ef',
  gold:    '#fbbf24',
};

export interface Note3DRow {
  id: string;
  content: string;
  position_x: number;
  position_y: number;
  position_z: number;
  color: NoteColor;
  created_at: string;
  updated_at: string;
}

export interface Notes3DProps {
  notes: Note3DRow[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPatch: (id: string, patch: { content?: string; color?: NoteColor; position?: { x: number; y: number; z: number } }) => void;
  onDelete: (id: string) => void;
}

function previewText(s: string): string {
  const trimmed = (s || '').trim();
  if (!trimmed) return '(empty note)';
  return trimmed.length > 80 ? trimmed.slice(0, 78) + '…' : trimmed;
}

function NoteCard({
  note, isSelected, hovered, onSelect, onHoverChange,
}: {
  note: Note3DRow;
  isSelected: boolean;
  hovered: boolean;
  onSelect: () => void;
  onHoverChange: (v: boolean) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const targetScale = isSelected ? 1.15 : (hovered ? 1.08 : 1);

  useFrame(() => {
    if (!ref.current) return;
    const cur = ref.current.scale.x;
    const next = THREE.MathUtils.lerp(cur, targetScale, 0.18);
    ref.current.scale.set(next, next, next);
  });

  const hex = COLOR_HEX[note.color] || COLOR_HEX.primary;
  const emissiveIntensity = isSelected ? 0.85 : (hovered ? 0.55 : 0.32);

  return (
    <group position={[note.position_x, note.position_y, note.position_z]}>
      <mesh
        ref={ref}
        onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); document.body.style.cursor = 'auto'; }}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        <RoundedBox args={[2.4, 1.4, 0.15]} radius={0.08} smoothness={4}>
          <meshStandardMaterial
            color={hex}
            emissive={hex}
            emissiveIntensity={emissiveIntensity}
            roughness={0.4}
            metalness={0.18}
          />
        </RoundedBox>
        <Text
          position={[0, 0, 0.085]}
          fontSize={0.135}
          maxWidth={2.15}
          anchorX="center"
          anchorY="middle"
          color="#0f172a"
          textAlign="center"
        >
          {previewText(note.content)}
        </Text>
      </mesh>
    </group>
  );
}

function CameraFocus({ targetId, notes }: { targetId: string | null; notes: Note3DRow[] }) {
  const { camera } = useThree();
  const target = useMemo(() => notes.find((n) => n.id === targetId), [notes, targetId]);
  useFrame(() => {
    if (!target) return;
    const goal = new THREE.Vector3(target.position_x, target.position_y, target.position_z + 4.2);
    camera.position.lerp(goal, 0.06);
    camera.lookAt(target.position_x, target.position_y, target.position_z);
  });
  return null;
}

export function Notes3D(props: Notes3DProps) {
  const { notes, selectedId, onSelect, onPatch, onDelete } = props;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState<string>('');

  const selectedNote = notes.find((n) => n.id === selectedId) || null;

  // Sync draft content when selection changes.
  useMemoEffect(() => {
    setDraftContent(selectedNote?.content ?? '');
  }, [selectedNote?.id]);

  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 55 }}
      onPointerMissed={() => onSelect(null)}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#020617']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 6, 6]} intensity={0.85} />
      <directionalLight position={[-4, -3, 2]} intensity={0.35} color="#22d3ee" />

      {notes.map((n) => (
        <NoteCard
          key={n.id}
          note={n}
          isSelected={n.id === selectedId}
          hovered={n.id === hoveredId}
          onSelect={() => onSelect(n.id)}
          onHoverChange={(v) => setHoveredId((h) => (v ? n.id : (h === n.id ? null : h)))}
        />
      ))}

      {notes.length === 0 && (
        <Text fontSize={0.32} color="#94a3b8" anchorX="center" anchorY="middle" maxWidth={6}>
          Press +Add note to drop your first note in 3D space.
        </Text>
      )}

      <CameraFocus targetId={selectedId} notes={notes} />
      <OrbitControls
        enablePan
        enableDamping
        dampingFactor={0.12}
        rotateSpeed={0.9}
        minDistance={3}
        maxDistance={18}
      />

      {selectedNote && (
        <Html
          position={[selectedNote.position_x, selectedNote.position_y - 1.05, selectedNote.position_z + 0.2]}
          center
          distanceFactor={6}
          style={{ pointerEvents: 'auto' }}
        >
          <div className="w-[320px] rounded-xl border border-slate-700 bg-slate-950/95 p-3 shadow-xl backdrop-blur">
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              onBlur={() => {
                if (draftContent !== selectedNote.content) onPatch(selectedNote.id, { content: draftContent });
              }}
              rows={4}
              className="w-full resize-none rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-slate-100 outline-none focus:border-amber-400"
              placeholder="Type your note…"
              maxLength={5000}
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {(Object.keys(COLOR_HEX) as NoteColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onPatch(selectedNote.id, { color: c })}
                  className={`h-5 w-5 rounded-full border-2 transition ${selectedNote.color === c ? 'border-white scale-110' : 'border-slate-700'}`}
                  style={{ backgroundColor: COLOR_HEX[c] }}
                  aria-label={`color ${c}`}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>{draftContent.length}/5000</span>
              <button
                type="button"
                onClick={() => onDelete(selectedNote.id)}
                className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-rose-300 hover:bg-rose-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </Html>
      )}
    </Canvas>
  );
}

// Minimal local effect helper to avoid pulling React.useEffect import.
import { useEffect } from 'react';
function useMemoEffect(fn: () => void, deps: unknown[]) { useEffect(fn, deps); }
