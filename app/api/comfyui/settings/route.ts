import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSettings as getComfySettings } from '@/lib/comfyui-client';

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
  const upsertPayload = {
    host: body.host || 'comfyui',
    port: Number(body.port) || 8188,
    secure: !!body.secure,
    api_endpoint: body.api_endpoint || '/api',
    ws_endpoint: body.ws_endpoint || '/ws',
    workflow_template: body.workflow_template || null,
    default_positive_prompt: body.default_positive_prompt || 'A high quality educational video, smooth motion, cinematic lighting',
    default_negative_prompt: body.default_negative_prompt || 'blurry, distorted, low quality, watermark',
    steps: Number(body.steps) || 20,
    cfg_scale: Number(body.cfg_scale) || 7.5,
    width: Number(body.width) || 768,
    height: Number(body.height) || 512,
    frame_count: Number(body.frame_count) || 24,
    fps: Number(body.fps) || 8,
    enabled: body.enabled !== false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('comfyui_settings')
    .upsert({ id: body.id || undefined, ...upsertPayload }, { onConflict: 'id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
