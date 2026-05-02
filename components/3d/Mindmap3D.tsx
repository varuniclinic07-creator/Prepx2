'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import { Suspense, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

// Sprint 3 / S3-3 — Animated Mindmap renderer.
// Standalone from SceneSpecRenderer because graph traversal and edge drawing
// don't fit the keyframe model. Hover -> highlight + tooltip. Click -> camera
// lerps to focus on the selected node.

type ColorHint =
  | 'primary' | 'cyan' | 'saffron' | 'success' | 'warning' | 'muted'
  | 'magenta' | 'gold';

const COLOR_MAP: Record<ColorHint, string> = {
  primary:  '#10b981',
  cyan:     '#22d3ee',
  saffron:  '#f59e0b',
  success:  '#22c55e',
  warning:  '#fbbf24',
  muted:    '#475569',
  magenta:  '#d946ef',
  gold:     '#fde68a',
};

export interface MindmapDoc {
  id: string;
  title: string;
  layout: 'radial' | 'tree' | 'force' | 'timeline';
}

export interface MindmapNodeDoc {
  id: string;
  parent_id: string | null;
  label: string;
  summary: string | null;
  depth: number;
  position: [number, number, number] | number[];
  color_hint: string | null;
}

export interface Mindmap3DProps {
  mindmap: MindmapDoc;
  nodes: MindmapNodeDoc[];
  className?: string;
}

interface NodeView {
  id: string;
  parent_id: string | null;
  label: string;
  summary: string | null;
  depth: number;
  position: [number, number, number];
  color: string;
}

function colorForNode(n: MindmapNodeDoc): string {
  const hint = (n.color_hint || '').toLowerCase();
  if (hint && (hint in COLOR_MAP)) return COLOR_MAP[hint as ColorHint];
  // Depth-based default palette.
  const depthPalette: ColorHint[] = ['primary', 'cyan', 'saffron', 'magenta', 'gold', 'success', 'warning'];
  return COLOR_MAP[depthPalette[n.depth % depthPalette.length]];
}

function asVec3(p: number[] | [number, number, number]): [number, number, number] {
  const a = Array.isArray(p) ? p : [0, 0, 0];
  return [Number(a[0]) || 0, Number(a[1]) || 0, Number(a[2]) || 0];
}

function Sphere({
  node,
  isHovered,
  isFocused,
  onHover,
  onClick,
}: {
  node: NodeView;
  isHovered: boolean;
  isFocused: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const radius = node.depth === 0 ? 0.5 : node.depth === 1 ? 0.35 : 0.22;

  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.4;
  });

  const emissiveIntensity = isHovered || isFocused ? 0.8 : 0.25;
  const scale = isHovered ? 1.25 : 1;

  return (
    <group position={node.position}>
      <mesh
        ref={ref}
        scale={scale}
        onPointerOver={(e) => { e.stopPropagation(); onHover(node.id); }}
        onPointerOut={(e) => { e.stopPropagation(); onHover(null); }}
        onClick={(e) => { e.stopPropagation(); onClick(node.id); }}
      >
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.35}
          metalness={0.5}
        />
      </mesh>
      <Text
        position={[0, radius + 0.3, 0]}
        fontSize={node.depth === 0 ? 0.32 : node.depth === 1 ? 0.24 : 0.18}
        color={isHovered ? '#fafafa' : '#e2e8f0'}
        anchorX="center"
        anchorY="middle"
        outlineColor="#020617"
        outlineWidth={0.02}
        maxWidth={3}
      >
        {node.label}
      </Text>
    </group>
  );
}

function Edges({ nodes, byId }: { nodes: NodeView[]; byId: Map<string, NodeView> }) {
  const lines = useMemo(() => {
    const out: { from: [number, number, number]; to: [number, number, number]; color: string }[] = [];
    for (const n of nodes) {
      if (!n.parent_id) continue;
      const p = byId.get(n.parent_id);
      if (!p) continue;
      out.push({ from: p.position, to: n.position, color: n.color });
    }
    return out;
  }, [nodes, byId]);

  return (
    <>
      {lines.map((l, i) => (
        <Line
          key={i}
          points={[l.from, l.to]}
          color={l.color}
          lineWidth={1.5}
          transparent
          opacity={0.55}
        />
      ))}
    </>
  );
}

function CameraFocus({ target }: { target: [number, number, number] | null }) {
  const { camera } = useThree();
  const targetVec = useRef(new THREE.Vector3(0, 0, 0));
  const lookVec = useRef(new THREE.Vector3(0, 0, 0));
  const lerpFactor = 0.07;
  const enabled = useRef(false);

  useFrame(() => {
    if (!target) return;
    if (!enabled.current) {
      // First frame after click — set target offset behind/above the node.
      lookVec.current.set(target[0], target[1], target[2]);
      targetVec.current.set(target[0] + 2.5, target[1] + 1.5, target[2] + 2.5);
      enabled.current = true;
    }
    camera.position.lerp(targetVec.current, lerpFactor);
    const cur = new THREE.Vector3();
    camera.getWorldDirection(cur);
    camera.lookAt(lookVec.current);
  });

  // Reset when target clears.
  if (!target && enabled.current) enabled.current = false;
  return null;
}

export function Mindmap3D({ mindmap, nodes, className }: Mindmap3DProps) {
  const view: NodeView[] = useMemo(
    () => nodes.map(n => ({
      id: n.id,
      parent_id: n.parent_id,
      label: n.label,
      summary: n.summary,
      depth: n.depth,
      position: asVec3(n.position as any),
      color: colorForNode(n),
    })),
    [nodes],
  );
  const byId = useMemo(() => {
    const m = new Map<string, NodeView>();
    for (const n of view) m.set(n.id, n);
    return m;
  }, [view]);

  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const focusTarget: [number, number, number] | null = focusId
    ? (byId.get(focusId)?.position ?? null)
    : null;

  const hovered = hoverId ? byId.get(hoverId) : null;

  return (
    <div
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <Canvas
        camera={{ position: [0, 2, 8], fov: 50 }}
        style={{ background: '#020617', borderRadius: 16 }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 7]} intensity={1.0} />
        <pointLight position={[-5, 3, -5]} intensity={0.5} color="#22d3ee" />

        <Suspense fallback={null}>
          <Edges nodes={view} byId={byId} />
          {view.map(n => (
            <Sphere
              key={n.id}
              node={n}
              isHovered={hoverId === n.id}
              isFocused={focusId === n.id}
              onHover={setHoverId}
              onClick={(id) => setFocusId((cur) => (cur === id ? null : id))}
            />
          ))}
          <CameraFocus target={focusTarget} />
        </Suspense>

        <OrbitControls enableDamping dampingFactor={0.08} />
      </Canvas>

      {hovered && hovered.summary && (
        <div
          style={{
            position: 'absolute',
            left: 16,
            bottom: 16,
            maxWidth: 360,
            background: 'rgba(2, 6, 23, 0.85)',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            borderRadius: 12,
            padding: '10px 14px',
            color: '#e2e8f0',
            fontSize: 13,
            lineHeight: 1.45,
            backdropFilter: 'blur(6px)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#f1f5f9' }}>{hovered.label}</div>
          <div style={{ color: '#cbd5e1' }}>{hovered.summary}</div>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          right: 16,
          top: 16,
          background: 'rgba(2, 6, 23, 0.7)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: 10,
          padding: '6px 10px',
          color: '#94a3b8',
          fontSize: 11,
        }}
      >
        {mindmap.layout} · {nodes.length} nodes
      </div>
    </div>
  );
}

export default Mindmap3D;
