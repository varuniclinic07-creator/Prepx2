export interface ComfyUISettings {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  api_endpoint: string;
  ws_endpoint: string;
  workflow_template: any;
  default_positive_prompt: string;
  default_negative_prompt: string;
  steps: number;
  cfg_scale: number;
  width: number;
  height: number;
  frame_count: number;
  fps: number;
  enabled: boolean;
}

export interface ComfyUIJobRequest {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg_scale?: number;
  seed?: number;
}

function getBaseUrl(settings: ComfyUISettings): string {
  const protocol = settings.secure ? 'https' : 'http';
  return `${protocol}://${settings.host}:${settings.port}`;
}

export async function getSettings(supabase: any): Promise<ComfyUISettings | null> {
  const { data, error } = await supabase.from('comfyui_settings').select('*').limit(1).single();
  if (error || !data) return null;
  return data as ComfyUISettings;
}

export async function queuePrompt(
  settings: ComfyUISettings,
  req: ComfyUIJobRequest
): Promise<{ prompt_id: string; client_id: string }> {
  const clientId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

  const workflow = structuredClone(settings.workflow_template || {});

  // Inject parameters into workflow nodes
  Object.keys(workflow).forEach((nodeId) => {
    const node = workflow[nodeId];
    if (node?.class_type?.toLowerCase().includes('ltx') || node?.class_type?.toLowerCase().includes('video')) {
      if (!node.inputs) node.inputs = {};
      if (req.prompt) node.inputs.positive = req.prompt;
      if (req.negative_prompt) node.inputs.negative = req.negative_prompt;
      if (req.width) node.inputs.width = req.width;
      if (req.height) node.inputs.height = req.height;
      if (req.steps) node.inputs.steps = req.steps;
      if (req.cfg_scale) node.inputs.cfg = req.cfg_scale;
      if (req.seed !== undefined) node.inputs.seed = req.seed;
    }
  });

  const res = await fetch(`${getBaseUrl(settings)}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => 'unknown error');
    throw new Error(`ComfyUI prompt failed (${res.status}): ${txt}`);
  }

  const data = await res.json();
  return { prompt_id: data.prompt_id, client_id: clientId };
}

export async function getPromptStatus(settings: ComfyUISettings, promptId: string): Promise<any> {
  const res = await fetch(`${getBaseUrl(settings)}/history/${promptId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function getQueueStatus(settings: ComfyUISettings): Promise<any> {
  const res = await fetch(`${getBaseUrl(settings)}/queue`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchOutputImage(
  settings: ComfyUISettings,
  filename: string,
  subfolder: string = '',
  type: string = 'output'
): Promise<Blob> {
  const params = new URLSearchParams({ filename, subfolder, type });
  const res = await fetch(`${getBaseUrl(settings)}/view?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return res.blob();
}
