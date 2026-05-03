// Converts a SceneSpec JSON (meshes, camera keyframes, labels, voiceover) into
// a ComfyUI workflow JSON + conditioning prompts for LTX 2.3 video generation.
// This bridges the declarative 3D scene contract with the GPU render pipeline.

import type { SceneSpec, MeshSpec, CameraKeyframe, LabelKeyframe } from '../3d/scene-spec';

export interface ComfyuiWorkflowInput {
  scene: SceneSpec;
  promptPrefix?: string;
  style?: 'classroom-board' | '3d-animated' | 'documentary';
  resolution?: { width: number; height: number };
  fps?: number;
  seed?: number;
}

export interface ComfyuiWorkflowOutput {
  workflow: Record<string, any>;
  positivePrompt: string;
  negativePrompt: string;
  estimatedDuration: number;
}

// Stable colour palette hints → rendered colour descriptions for conditioning.
const COLOR_WORDS: Record<string, string> = {
  primary: 'deep blue-purple',
  cyan: 'bright cyan',
  saffron: 'warm saffron orange',
  success: 'emerald green',
  warning: 'amber yellow',
  muted: 'slate grey',
  magenta: 'vibrant magenta',
  gold: 'metallic gold',
};

function describeMesh(m: MeshSpec): string {
  const color = COLOR_WORDS[m.color] || m.color;
  const label = m.label ? ` labeled "${m.label}"` : '';
  const emissive = m.emissive ? ' glowing' : '';
  return `${color}${emissive} 3D ${m.kind}${label}`;
}

function describeCamera(keyframes: CameraKeyframe[]): string {
  if (keyframes.length <= 1) return 'static establishing shot';
  const start = keyframes[0];
  const end = keyframes[keyframes.length - 1];
  const dx = (end.position[0] - start.position[0]).toFixed(1);
  const dy = (end.position[1] - start.position[1]).toFixed(1);
  const dz = (end.position[2] - start.position[2]).toFixed(1);
  if (Math.abs(Number(dz)) > Math.abs(Number(dx))) return 'smooth dolly zoom camera move';
  if (Math.abs(Number(dx)) > 0.5 || Math.abs(Number(dy)) > 0.5) return 'gentle orbit camera pan';
  return 'slow push-in camera move';
}

function describeLabels(labels: LabelKeyframe[]): string {
  if (labels.length === 0) return '';
  const texts = labels.slice(0, 6).map(l => l.text).join(' | ');
  return `floating educational text: ${texts}`;
}

const STYLE_MODIFIERS: Record<string, string> = {
  'classroom-board': 'classroom setting, whiteboard with diagrams, teacher explaining, warm indoor lighting, educational documentary style',
  '3d-animated': 'cinematic 3D animation, Unreal Engine quality, photorealistic materials, dramatic volumetric lighting, depth of field, particle effects',
  documentary: 'documentary film style, archival footage aesthetic, narrative storytelling, subtle camera movement, professional color grading',
};

export function buildScenePrompt(input: ComfyuiWorkflowInput): string {
  const { scene, promptPrefix, style = '3d-animated' } = input;

  const meshDesc = scene.meshes.length > 0
    ? scene.meshes.map(describeMesh).join(', ')
    : 'abstract educational visualization';

  const cameraDesc = describeCamera(scene.cameraKeyframes);
  const labelDesc = describeLabels(scene.labels);
  const styleMod = STYLE_MODIFIERS[style] || STYLE_MODIFIERS['3d-animated'];

  return [
    promptPrefix || 'UPSC CSE educational 3D animation',
    `showing ${meshDesc}`,
    labelDesc,
    cameraDesc,
    `background: ${scene.background}`,
    scene.voiceover ? `narrated: ${scene.voiceover.text.slice(0, 200)}` : '',
    styleMod,
    '4K resolution, professional educational content, India UPSC exam preparation, high production value',
  ].filter(Boolean).join(', ');
}

export function buildNegativePrompt(): string {
  return [
    'blurry', 'low quality', 'watermark', 'text errors', 'distorted faces',
    'jittery motion', 'flickering', 'oversaturated', 'dark shadows',
    'amateur', 'pixelated', 'compression artifacts', 'wrong text',
    'misspelled', 'unreadable', 'horror', 'gore', 'violence',
  ].join(', ');
}

export function buildSceneWorkflow(input: ComfyuiWorkflowInput): ComfyuiWorkflowOutput {
  const positive = buildScenePrompt(input);
  const negative = buildNegativePrompt();
  const { width = 1280, height = 720 } = input.resolution || {};
  const fps = input.fps || 24;
  const totalFrames = Math.max(1, Math.round((input.scene.durationSeconds || 60) * fps));
  const seed = input.seed ?? Math.floor(Math.random() * 999999999);

  // Minimal ComfyUI API workflow. For a real LTX 2.3 deployment, replace the
  // sampler node with the actual LTXVideoSampler class_type and wire CLIP nodes.
  const workflow: Record<string, any> = {
    "1": {
      inputs: { text: positive, clip: ["6", 0] },
      class_type: "CLIPTextEncode",
      _meta: { title: "Positive Prompt" },
    },
    "2": {
      inputs: { text: negative, clip: ["6", 0] },
      class_type: "CLIPTextEncode",
      _meta: { title: "Negative Prompt" },
    },
    "3": {
      inputs: {
        width,
        height,
        length: totalFrames,
        frame_rate: fps,
        seed,
        positive: ["1", 0],
        negative: ["2", 0],
        steps: 20,
        cfg: 7.0,
        scheduler: "dpmpp_2m",
        denoise: 1.0,
      },
      class_type: "LTXVideoSampler",
      _meta: { title: "LTX Video Sampler" },
    },
    "4": {
      inputs: { samples: ["3", 0], vae: ["5", 0] },
      class_type: "VAEDecode",
      _meta: { title: "VAE Decode" },
    },
    "5": {
      inputs: { vae_name: "ltx_video_vae.safetensors" },
      class_type: "VAELoader",
      _meta: { title: "Load VAE" },
    },
    "6": {
      inputs: { clip_name: "t5xxl_fp16.safetensors", type: "ltx_video" },
      class_type: "CLIPLoader",
      _meta: { title: "Load CLIP" },
    },
    "7": {
      inputs: {
        filename_prefix: `prepx/baked/${Date.now()}`,
        fps,
        images: ["4", 0],
      },
      class_type: "SaveAnimatedWEBP",
      _meta: { title: "Save Output" },
    },
  };

  return {
    workflow,
    positivePrompt: positive,
    negativePrompt: negative,
    estimatedDuration: input.scene.durationSeconds || 60,
  };
}

export function estimateRenderTime(durationSeconds: number): { minMinutes: number; maxMinutes: number } {
  const perSecondGpu = 0.25; // LTX 2.3 on A100: ~15s GPU per 60s output at 720p
  const base = durationSeconds * perSecondGpu;
  return {
    minMinutes: Math.ceil(base * 0.7),
    maxMinutes: Math.ceil(base * 1.6),
  };
}
