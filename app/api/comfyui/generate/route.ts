import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSettings, queuePrompt } from '@/lib/comfyui-client';

// POST /api/comfyui/generate — queue AI video generation
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { prompt, astra_script_id, width, height, steps, cfg_scale, seed } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }
    if (prompt.length > 500) {
      return NextResponse.json({ error: 'Prompt too long. Max 500 chars.' }, { status: 413 });
    }

    const settings = await getSettings(supabase);
    if (!settings || !settings.enabled) {
      return NextResponse.json({ error: 'ComfyUI not configured or disabled' }, { status: 503 });
    }

    const { prompt_id, client_id } = await queuePrompt(settings, {
      prompt,
      width: width || settings.width,
      height: height || settings.height,
      steps: steps || settings.steps,
      cfg_scale: cfg_scale || settings.cfg_scale,
      seed: seed || Math.floor(Math.random() * 2147483647),
    });

    // Save job to DB
    const { data: job, error: jobError } = await supabase
      .from('comfyui_jobs')
      .insert({
        astra_script_id: astra_script_id || null,
        prompt_id,
        client_id,
        workflow: settings.workflow_template,
        status: 'queued',
      })
      .select()
      .single();

    if (jobError) {
      console.error('[ComfyUI] Failed to save job:', jobError);
    }

    // Update astra_scripts if linked
    if (astra_script_id) {
      await supabase
        .from('astra_scripts')
        .update({ video_status: 'queued', comfy_prompt_id: prompt_id })
        .eq('id', astra_script_id);
    }

    return NextResponse.json({
      success: true,
      prompt_id,
      client_id,
      job_id: job?.id || null,
      status: 'queued',
      message: 'Video generation queued in ComfyUI',
    });
  } catch (err: any) {
    console.error('[ComfyUI Generate] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'ComfyUI generation failed' },
      { status: 500 }
    );
  }
}
