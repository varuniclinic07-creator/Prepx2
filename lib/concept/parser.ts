// Sprint 9-B — Document parsing for "Explain This" / Product B.
//
// Accepts: PDF, DOCX, raw text. Returns normalized plain text.
// Day-2: PPT (officeparser), images (tesseract.js OCR).
//
// PDF: pdfjs-dist legacy build — works in Node without DOMParser.
// DOCX: mammoth raw-text extraction (preserves headings as plain lines).

import mammoth from 'mammoth';

export type SupportedDocType = 'pdf' | 'docx' | 'pptx' | 'image' | 'text';

export interface ParseResult {
  text: string;
  pageCount?: number;
  charCount: number;
  truncated: boolean;
}

const MAX_CHARS = 60_000; // ~12k tokens — enough for one chapter; trims runaway docs

function normalize(s: string): string {
  return s.replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function clip(s: string): { text: string; truncated: boolean } {
  if (s.length <= MAX_CHARS) return { text: s, truncated: false };
  return { text: s.slice(0, MAX_CHARS), truncated: true };
}

export async function parseRawText(raw: string): Promise<ParseResult> {
  const norm = normalize(raw);
  const { text, truncated } = clip(norm);
  return { text, charCount: text.length, truncated };
}

export async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  // pdfjs-dist's legacy entrypoint runs in Node without DOM polyfills.
  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
  });
  const doc = await loadingTask.promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const pageText = (tc.items as any[]).map(it => ('str' in it ? it.str : '')).join(' ');
    pages.push(pageText);
  }
  await doc.cleanup();
  await doc.destroy();

  const norm = normalize(pages.join('\n\n'));
  const { text, truncated } = clip(norm);
  return { text, pageCount: doc.numPages, charCount: text.length, truncated };
}

export async function parseDocx(buffer: Buffer): Promise<ParseResult> {
  const result = await mammoth.extractRawText({ buffer });
  const norm = normalize(result.value || '');
  const { text, truncated } = clip(norm);
  return { text, charCount: text.length, truncated };
}

export async function parseDocument(
  documentType: SupportedDocType,
  payload: { buffer?: Buffer; text?: string }
): Promise<ParseResult> {
  switch (documentType) {
    case 'text':
      if (!payload.text) throw new Error('parseDocument: text payload required for documentType=text');
      return parseRawText(payload.text);
    case 'pdf':
      if (!payload.buffer) throw new Error('parseDocument: buffer required for documentType=pdf');
      return parsePdf(payload.buffer);
    case 'docx':
      if (!payload.buffer) throw new Error('parseDocument: buffer required for documentType=docx');
      return parseDocx(payload.buffer);
    case 'pptx':
    case 'image':
      throw new Error(`parseDocument: documentType=${documentType} not yet supported (Day-2 OCR/PPT)`);
    default:
      throw new Error(`parseDocument: unknown documentType ${documentType}`);
  }
}
