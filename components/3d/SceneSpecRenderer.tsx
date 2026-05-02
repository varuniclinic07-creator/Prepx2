'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useMemo, useRef, useState, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import type {
  SceneSpec, MeshSpec, ColorHint, CameraKeyframe, LabelKeyframe,
} from '@/lib/3d/scene-spec';

// Single shared 3D renderer used by every Sprint 3 feature. Reads a SceneSpec
// (jsonb stored in the DB) and animates it according to camera + label
// keyframes. Designed to feel premium without external assets — primitives
// only, emissive materials, smooth Catmull-Rom camera path.

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

const BG_MAP: Record<ColorHint, string> = {
  primary:  '#020617',
  cyan:     '#082f49',
  saffron:  '#451a03',
  success:  '#022c22',
  warning:  '#451a03',
  muted:    '#0f172a',
  magenta:  '#3b0764',
  gold:     '#451a03',
};

function MeshPrimitive({ mesh, t }: { mesh: MeshSpec; t: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const color = COLOR_MAP[mesh.color] || '#10b981';
  const scale: [number, number, number] = useMemo(() => {
    if (typeof mesh.scale === 'number') return [mesh.scale, mesh.scale, mesh.scale];
    if (Array.isArray(mesh.scale)) return mesh.scale as [number, number, number];
    return [1, 1, 1];
  }, [mesh.scale]);

  useFrame(() => {
    if (!ref.current) return;
    // Gentle bob to give scenes life even when camera is still.
    ref.current.rotation.y = t * 0.4;
  });

  const geometry = (() => {
    switch (mesh.kind) {
      case 'sphere':       return <sphereGeometry args={[1, 32, 32]} />;
      case 'box':          return <boxGeometry args={[1, 1, 1]} />;
      case 'torus':        return <torusGeometry args={[0.8, 0.25, 16, 64]} />;
      case 'cone':         return <coneGeometry args={[0.8, 1.5, 32]} />;
      case 'plane':        return <planeGeometry args={[2, 2]} />;
      case 'icosahedron':  return <icosahedronGeometry args={[1, 1]} />;
      default:             return <sphereGeometry args={[1, 32, 32]} />;
    }
  })();

  return (
    <group position={mesh.position} rotation={mesh.rotation} scale={scale}>
      <mesh ref={ref}>
        {geometry}
        <meshStandardMaterial
          color={color}
          emissive={mesh.emissive ? color : '#000'}
          emissiveIntensity={mesh.emissive ? 0.4 : 0}
          roughness={0.3}
          metalness={0.4}
        />
      </mesh>
      {mesh.label && (
        <Text
          position={[0, 1.4, 0]}
          fontSize={0.28}
          color="#e2e8f0"
          anchorX="center"
          anchorY="middle"
          outlineColor="#020617"
          outlineWidth={0.02}
        >
          {mesh.label}
        </Text>
      )}
    </group>
  );
}

function CameraRig({ keyframes, t, total }: { keyframes: CameraKeyframe[]; t: number; total: number }) {
  useFrame((state) => {
    if (keyframes.length === 0) return;
    const time = (t % total + total) % total;
    let i = 0;
    while (i < keyframes.length - 1 && keyframes[i + 1].timeSeconds <= time) i++;
    const a = keyframes[i];
    const b = keyframes[i + 1] || a;
    const span = (b.timeSeconds - a.timeSeconds) || 1;
    const p = Math.min(1, Math.max(0, (time - a.timeSeconds) / span));
    const ease = p * p * (3 - 2 * p);  // smoothstep

    const cam = state.camera;
    cam.position.set(
      a.position[0] + (b.position[0] - a.position[0]) * ease,
      a.position[1] + (b.position[1] - a.position[1]) * ease,
      a.position[2] + (b.position[2] - a.position[2]) * ease,
    );
    const lookAt = new THREE.Vector3(
      a.lookAt[0] + (b.lookAt[0] - a.lookAt[0]) * ease,
      a.lookAt[1] + (b.lookAt[1] - a.lookAt[1]) * ease,
      a.lookAt[2] + (b.lookAt[2] - a.lookAt[2]) * ease,
    );
    cam.lookAt(lookAt);
    if (a.fov || b.fov) {
      const fov = (a.fov || 50) + ((b.fov || a.fov || 50) - (a.fov || 50)) * ease;
      (cam as THREE.PerspectiveCamera).fov = fov;
      (cam as THREE.PerspectiveCamera).updateProjectionMatrix();
    }
  });
  return null;
}

function LabelLayer({ labels, t }: { labels: LabelKeyframe[]; t: number }) {
  return (
    <>
      {labels.map((lbl, i) => {
        const start = lbl.timeSeconds;
        const dur = lbl.durationSeconds ?? 3;
        if (t < start || t > start + dur) return null;
        const opacity = Math.min(1, (t - start) * 4) * Math.min(1, (start + dur - t) * 4);
        return (
          <Text
            key={i}
            position={lbl.position}
            fontSize={lbl.size ?? 0.32}
            color="#f8fafc"
            anchorX="center"
            anchorY="middle"
            fillOpacity={opacity}
            outlineColor="#020617"
            outlineWidth={0.03}
          >
            {lbl.text}
          </Text>
        );
      })}
    </>
  );
}

function Clock({ onTick, total, autoPlay }: { onTick: (t: number) => void; total: number; autoPlay: boolean }) {
  useFrame((state) => {
    if (!autoPlay) return;
    const t = state.clock.elapsedTime % total;
    onTick(t);
  });
  return null;
}

export interface SceneSpecRendererProps {
  spec: SceneSpec;
  className?: string;
  autoPlay?: boolean;
  showControls?: boolean;
  onLoaded?: () => void;
}

export function SceneSpecRenderer({
  spec,
  className,
  autoPlay = true,
  showControls = true,
  onLoaded,
}: SceneSpecRendererProps) {
  const [t, setT] = useState(0);
  useEffect(() => { onLoaded?.(); }, [onLoaded]);

  const bg = BG_MAP[spec.background] || '#020617';

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 1, 5], fov: 50 }}
        style={{ background: bg, borderRadius: 16 }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={spec.ambientIntensity ?? 0.6} />
        <directionalLight position={[5, 10, 7]} intensity={1.2} castShadow />
        <pointLight position={[-5, 3, -5]} intensity={0.6} color="#22d3ee" />

        <Suspense fallback={null}>
          {spec.meshes.map((m, i) => <MeshPrimitive key={i} mesh={m} t={t} />)}
          <LabelLayer labels={spec.labels} t={t} />
          <CameraRig keyframes={spec.cameraKeyframes} t={t} total={spec.durationSeconds} />
          <Clock onTick={setT} total={spec.durationSeconds} autoPlay={autoPlay} />
        </Suspense>

        {showControls && <OrbitControls enableDamping dampingFactor={0.08} />}
      </Canvas>
    </div>
  );
}
