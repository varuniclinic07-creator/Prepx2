'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

// Sprint 4-3 — 3D Progress Ring for the syllabus navigator.
// A torus that fills based on mastery percentage (0-1).

interface ProgressRingProps {
  progress: number;        // 0-1
  color: string;
  label: string;
  radius?: number;
  tubeRadius?: number;
  position?: [number, number, number];
  onClick?: () => void;
  isHovered?: boolean;
  onHover?: (hovered: boolean) => void;
}

function RingMesh({
  progress,
  color,
  radius = 1,
  tubeRadius = 0.08,
}: {
  progress: number;
  color: string;
  radius: number;
  tubeRadius: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.3;
    ref.current.rotation.x += dt * 0.1;
  });

  // Full greyed-out ring + colored arc on top.
  return (
    <group>
      {/* Background ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, tubeRadius, 16, 100]} />
        <meshStandardMaterial color="#334155" roughness={0.5} opacity={0.4} transparent />
      </mesh>
      {/* Progress arc — scale the torus arc based on progress */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, tubeRadius, 16, 100, 0, Math.PI * 2 * progress]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>
    </group>
  );
}

export default function ProgressRing({
  progress,
  color,
  label,
  radius = 1,
  tubeRadius = 0.08,
  position = [0, 0, 0],
  onClick,
  isHovered = false,
  onHover,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const pct = Math.round(clamped * 100);

  return (
    <group
      position={position}
      scale={isHovered ? 1.15 : 1}
      onPointerOver={(e) => { e.stopPropagation(); onHover?.(true); }}
      onPointerOut={(e) => { e.stopPropagation(); onHover?.(false); }}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    >
      <RingMesh progress={clamped} color={color} radius={radius} tubeRadius={tubeRadius} />
      <Text
        position={[0, 0, 0]}
        fontSize={0.22}
        color={isHovered ? '#fafafa' : '#e2e8f0'}
        anchorX="center"
        anchorY="middle"
        outlineColor="#020617"
        outlineWidth={0.03}
      >
        {label}
      </Text>
      <Text
        position={[0, -0.35, 0]}
        fontSize={0.16}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineColor="#020617"
        outlineWidth={0.02}
      >
        {`${pct}%`}
      </Text>
    </group>
  );
}
