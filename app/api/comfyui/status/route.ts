import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSettings, getPromptStatus } from '@/lib/comfyui-client';

// POST /api/comfyui/status — poll ComfyUI prompt status
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { prompt_id } = body;
    if (!prompt_id || typeof prompt_id !== 'string') {
      return NextResponse.json({ error: 'Missing prompt_id' }, { status: 400 });
    }

    const settings = await getSettings(supabase);
    if (!settings || !settings.enabled) {
      return NextResponse.json({ error: 'ComfyUI not configured or disabled' }, { status: 503 });
    }

    // 1. Check ComfyUI history API
    const history = await getPromptStatus(settings, prompt_id);
    const jobEntry = history?.[prompt_id];

    let status: string;
    let output_files: string[] = [];
    let error_message: string | null = null;

    if (jobEntry) {
      status = jobEntry.status?.status_str || 'completed';
      error_message = jobEntry.status?.messages?.find((m: any) => m[0] === 'exception')?.[1]?.[0]?.error_message || null;

      // Extract output images/videos from outputs
      const outputs = jobEntry.outputs || {};
      for (const nodeId of Object.keys(outputs)) {
        const nodeOutputs = outputs[nodeId] || [];
        for (const output of nodeOutputs) {
          if (output?.filename) output_files.push(output.filename);
          if (output?.subfolder) output_files.push(`${output.subfolder}/${output.filename}`);
        }
      }

      // Update DB
      await supabase
        .from('comfyui_jobs')
        .update({ status: error_message ? 'failed' : 'completed', output_files, error_message, completed_at: new Date().toISOString() })
        .eq('prompt_id', prompt_id);

      // Update astra_scripts
      await supabase
        .from('astra_scripts')
        .update({ video_status: error_message ? 'failed' : 'completed', comfy_video_url: output_files[0] || null })
        .eq('comfy_prompt_id', prompt_id);
    } else {
      // Still in queue / processing
      const queue = await getPromptStatus(settings, prompt_id) || null;
      status = queue?.queue_remaining > 0 ? 'queued' : 'processing';
    }

    return NextResponse.json({
      prompt_id,
      status,
      output_files,
      error_message,
      history: !!jobEntry,
    });
  } catch (err: any) {
    console.error('[ComfyUI Status] Error:', err);
    return NextResponse.json({ error: err?.message || 'Status check failed' }, { status: 500 });
  }
}
