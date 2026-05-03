'use client';

import { useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

// Sprint 4-3 — 3D Territory Conquest Map.
// Renders Indian districts as colored tiles on a flat map plane.
// Color shows squad ownership; click to view/capture details.

interface DistrictState {
  districtId: string;
  districtName: string;
  stateName: string;
  ownerSquadId: string | null;
  ownerSquadName: string | null;
  captureCount: number;
  capturedAt: string | null;
  centerLat: number;
  centerLng: number;
}

// Approximate grid layout for India's bounding box:
// Lat: 8°N to 38°N → map to X axis
// Lng: 68°E to 98°E → map to Z axis
function latLngToWorld(lat: number, lng: number): [number, number, number] {
  const x = ((lng - 83) / 15) * 8;  // center around 83°E
  const z = ((lat - 23) / 15) * 8;  // center around 23°N
  return [x, 0, -z];
}

const SQUAD_COLORS = [
  '#22d3ee', '#f59e0b', '#d946ef', '#22c55e', '#fbbf24',
  '#a78bfa', '#38bdf8', '#f472b6', '#34d399', '#fb923c',
  '#f87171', '#c084fc', '#60a5fa', '#818cf8', '#e879f9',
];

function getSquadColor(squadId: string | null, squadIndex: number): string {
  if (!squadId) return '#334155';
  return SQUAD_COLORS[squadIndex % SQUAD_COLORS.length];
}

function DistrictTile({
  district,
  color,
  isHovered,
  isSelected,
  onHover,
  onClick,
}: {
  district: DistrictState;
  color: string;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}) {
  const pos = latLngToWorld(district.centerLat, district.centerLng);
  const scale = isHovered ? 1.25 : 1;
  const emissiveIntensity = isHovered || isSelected ? 0.7 : 0.2;

  return (
    <group position={pos}>
      <mesh
        scale={[0.45, scale * 0.12, 0.45]}
        onPointerOver={(e) => { e.stopPropagation(); onHover(district.districtId); }}
        onPointerOut={(e) => { e.stopPropagation(); onHover(null); }}
        onClick={(e) => { e.stopPropagation(); onClick(district.districtId); }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>
      <Text
        position={[0, 0.25, 0]}
        fontSize={0.12}
        color={isHovered ? '#fafafa' : '#94a3b8'}
        anchorX="center"
        anchorY="middle"
        maxWidth={1.5}
        outlineColor="#020617"
        outlineWidth={0.02}
      >
        {district.districtName}
      </Text>
    </group>
  );
}

function MapPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
      <planeGeometry args={[16, 16]} />
      <meshStandardMaterial color="#0f172a" roughness={0.8} opacity={0.6} transparent />
    </mesh>
  );
}

export interface ConquestMapProps {
  districts: DistrictState[];
  className?: string;
  onCaptureDistrict?: (districtId: string) => void;
}

export default function ConquestMap({ districts, className, onCaptureDistrict }: ConquestMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const squadIds = useMemo(() => {
    const seen = new Map<string, number>();
    let idx = 0;
    for (const d of districts) {
      if (d.ownerSquadId && !seen.has(d.ownerSquadId)) {
        seen.set(d.ownerSquadId, idx++);
      }
    }
    return seen;
  }, [districts]);

  const selectedDistrict = selectedId
    ? districts.find((d) => d.districtId === selectedId) || null
    : null;

  const handleClick = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 8, 8], fov: 45 }}
        style={{ background: '#020617', borderRadius: 16 }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 12, 7]} intensity={1.2} />
        <pointLight position={[-5, 4, -5]} intensity={0.5} color="#22d3ee" />
        <pointLight position={[5, 4, 5]} intensity={0.5} color="#f59e0b" />

        <Suspense fallback={null}>
          <MapPlane />
          {districts.map((d) => (
            <DistrictTile
              key={d.districtId}
              district={d}
              color={getSquadColor(d.ownerSquadId, squadIds.get(d.ownerSquadId || '') ?? 0)}
              isHovered={hoveredId === d.districtId}
              isSelected={selectedId === d.districtId}
              onHover={setHoveredId}
              onClick={handleClick}
            />
          ))}
        </Suspense>

        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={4}
          maxDistance={14}
        />
      </Canvas>

      {/* Selected district panel */}
      {selectedDistrict && (
        <div
          style={{
            position: 'absolute',
            right: 16,
            top: 16,
            background: 'rgba(2, 6, 23, 0.88)',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            borderRadius: 12,
            padding: '12px 16px',
            color: '#e2e8f0',
            fontSize: 13,
            lineHeight: 1.5,
            maxWidth: 280,
            backdropFilter: 'blur(6px)',
          }}
        >
          <div className="font-semibold text-slate-100 text-base mb-1">{selectedDistrict.districtName}</div>
          <div className="text-slate-400 text-xs mb-2">{selectedDistrict.stateName}</div>
          {selectedDistrict.ownerSquadName ? (
            <div className="text-xs mb-2">
              Owned by: <span className="text-cyan-400 font-medium">{selectedDistrict.ownerSquadName}</span>
              <span className="text-slate-500"> · captured {selectedDistrict.captureCount}x</span>
            </div>
          ) : (
            <div className="text-xs text-slate-500 mb-2">Unclaimed territory</div>
          )}
          <button
            onClick={() => {
              onCaptureDistrict?.(selectedDistrict.districtId);
              setSelectedId(null);
            }}
            className="w-full mt-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium py-1.5 px-3 rounded transition"
          >
            Capture District
          </button>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          bottom: 16,
          background: 'rgba(2, 6, 23, 0.7)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: 10,
          padding: '6px 10px',
          color: '#94a3b8',
          fontSize: 11,
        }}
      >
        {districts.length} districts ·{' '}
        {districts.filter((d) => d.ownerSquadId).length} captured
      </div>
    </div>
  );
}
