import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSettings as getComfySettings } from '@/lib/comfyui-client';
import { z } from 'zod';

const SettingsSchema = z.object({
  id: z.string().optional(),
  host: z.string().max(200).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  secure: z.boolean().optional(),
  api_endpoint: z.string().max(200).optional(),
  ws_endpoint: z.string().max(200).optional(),
  workflow_template: z.string().max(10000).nullable().optional(),
  default_positive_prompt: z.string().max(2000).optional(),
  default_negative_prompt: z.string().max(2000).optional(),
  steps: z.number().int().min(1).max(150).optional(),
  cfg_scale: z.number().min(0).max(30).optional(),
  width: z.number().int().min(64).max(2048).optional(),
  height: z.number().int().min(64).max(2048).optional(),
  frame_count: z.number().int().min(1).max(300).optional(),
  fps: z.number().int().min(1).max(120).optional(),
  enabled: z.boolean().optional(),
});

// GET /api/comfyui/settings — read settings
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const settings = await getComfySettings(supabase);
  if (!settings) return NextResponse.json({ error: 'Not configured' }, { status: 404 });
  return NextResponse.json(settings);
}

// POST /api/comfyui/settings — upsert settings
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const v = parsed.data;
  const upsertPayload = {
    host: v.host || 'comfyui',
    port: v.port || 8188,
    secure: v.secure ?? false,
    api_endpoint: v.api_endpoint || '/api',
    ws_endpoint: v.ws_endpoint || '/ws',
    workflow_template: v.workflow_template || null,
    default_positive_prompt: v.default_positive_prompt || 'A high quality educational video, smooth motion, cinematic lighting',
    default_negative_prompt: v.default_negative_prompt || 'blurry, distorted, low quality, watermark',
    steps: v.steps || 20,
    cfg_scale: v.cfg_scale || 7.5,
    width: v.width || 768,
    height: v.height || 512,
    frame_count: v.frame_count || 24,
    fps: v.fps || 8,
    enabled: v.enabled !== false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('comfyui_settings')
    .upsert({ id: v.id || undefined, ...upsertPayload }, { onConflict: 'id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
