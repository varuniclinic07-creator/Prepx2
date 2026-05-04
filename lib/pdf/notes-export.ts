// PDF export for the user's 3D notes surface (Sprint 6 S6-2).
// Reuses lib/pdf/topic-export to produce a PrepX-branded PDF.

import { buildTopicPdf, type PdfSection } from './topic-export';

export interface NotesPdfInput {
  topicTitle: string;
  notes: Array<{
    content: string;
    color: string;
    created_at: string;
  }>;
}

export async function buildNotesPdf(input: NotesPdfInput): Promise<Uint8Array> {
  const sections: PdfSection[] = input.notes.length
    ? input.notes.map((n, i) => ({
        heading: `Note ${i + 1}`,
        body: (n.content || '').trim() || '(empty note)',
        callout: `Color: ${n.color} • Saved: ${new Date(n.created_at).toLocaleDateString('en-IN')}`,
      }))
    : [{
        heading: 'No notes yet',
        body: 'Add notes from the 3D notes surface on the topic page to populate this export.',
      }];

  return buildTopicPdf({
    title: 'My 3D Notes',
    subtitle: input.topicTitle,
    sections,
    footer: 'PrepX • upsc.aimasteryedu.in',
  });
}
