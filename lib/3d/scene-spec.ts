// Scene-spec is the JSON contract between the LLM-driven generators and the
// React Three Fiber runtime. The generator emits one of these objects; the
// `<SceneSpecRenderer />` client component renders it with R3F.
//
// Keep this small, declarative, and serialisable — every artifact (mnemonic,
// imagine-video beat, mindmap, interview debrief) stores it as jsonb and
// the same renderer draws all of them. ComfyUI/Remotion bake the same spec
// to MP4 when high-fidelity render is requested.

export type Vec3 = [number, number, number];
export type ColorHint =
  | 'primary' | 'cyan' | 'saffron' | 'success' | 'warning' | 'muted'
  | 'magenta' | 'gold';

export interface MeshSpec {
  kind: 'sphere' | 'box' | 'torus' | 'cone' | 'plane' | 'icosahedron';
  position: Vec3;
  scale?: Vec3 | number;
  rotation?: Vec3;             // radians
  color: ColorHint;
  emissive?: boolean;
  label?: string;              // floating text above the mesh
}

export interface CameraKeyframe {
  timeSeconds: number;
  position: Vec3;
  lookAt: Vec3;
  fov?: number;
}

export interface LabelKeyframe {
  timeSeconds: number;
  position: Vec3;
  text: string;
  durationSeconds?: number;
  size?: number;
}

export interface SceneSpec {
  version: 1;
  background: ColorHint;       // 'primary' default → tenant primary; 'muted' for slate
  durationSeconds: number;     // total scene length
  meshes: MeshSpec[];
  cameraKeyframes: CameraKeyframe[];
  labels: LabelKeyframe[];
  ambientIntensity?: number;
  // Optional voiceover for video-style scenes (mnemonic = no, imagine = yes)
  voiceover?: { text: string; voice: 'male_in' | 'female_in' };
}

export function emptyScene(durationSeconds = 10): SceneSpec {
  return {
    version: 1,
    background: 'primary',
    durationSeconds,
    meshes: [],
    cameraKeyframes: [
      { timeSeconds: 0,             position: [0, 1, 5], lookAt: [0, 0, 0] },
      { timeSeconds: durationSeconds, position: [3, 2, 5], lookAt: [0, 0, 0] },
    ],
    labels: [],
    ambientIntensity: 0.6,
  };
}

// Defensive validator — returns null when input is malformed so the caller
// can fall back to a safe scene rather than crashing the renderer.
export function parseSceneSpec(raw: unknown): SceneSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as any;
  if (r.version !== 1) return null;
  if (!Array.isArray(r.meshes) || !Array.isArray(r.cameraKeyframes) || !Array.isArray(r.labels)) {
    return null;
  }
  if (typeof r.durationSeconds !== 'number' || r.durationSeconds <= 0) return null;
  return r as SceneSpec;
}
