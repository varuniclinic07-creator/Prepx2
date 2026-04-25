import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/scraper/pipeline';

export async function POST(req: Request) {
  const { sourceId, regenerateAll } = await req.json().catch(() => ({}));
  try {
    const result = await runPipeline(sourceId, !!regenerateAll);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
