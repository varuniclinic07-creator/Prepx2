import { SOURCE_REGISTRY, SCRAPE_OUTPUT_DIR, MAX_PAGES_PER_SOURCE } from './config';
import { spawn } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

export interface ScrapedArticle {
  sourceId: string;
  sourceName: string;
  url: string;
  title: string;
  content: string;
  date?: string;
  type: 'article' | 'pdf';
  pdfPath?: string;
  chunks?: string[];
}
async function directFetch(url: string, attempt = 0): Promise<{ html: string; ok: boolean }> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    if (html.includes('cf-browser-verification') || html.includes('challenge-platform') || html.includes('Checking your browser')) {
      console.warn(`[Scraper] CAPTCHA detected at ${url}`);
      return { html, ok: false };
    }
    return { html, ok: true };
  } catch (e) {
    if (attempt < 3) {
      const delay = 1000 * Math.pow(2, attempt);
      console.log(`[Scraper] Retry ${attempt + 1} for ${url} in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
      return directFetch(url, attempt + 1);
    }
    console.error(`[Scraper] Failed after 3 retries: ${url}`, e);
    return { html: '', ok: false };
  }
}

async function playwrightFetch(url: string): Promise<{ html: string; ok: boolean }> {
  try {
    // @ts-ignore
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const html = await page.content();
    await browser.close();
    return { html, ok: true };
  } catch (e) {
    return { html: '', ok: false };
  }
}

function extractLinks(html: string, baseUrl: string): { url: string; title: string }[] {
  const links: { url: string; title: string }[] = [];
  const re = new RegExp("<a[^>]+href=[\"']([^\"']+)[\"'][^>]*>([\\s\\S]*?)<\\/a>", 'gi');
  let m;
  while ((m = re.exec(html)) !== null && links.length < MAX_PAGES_PER_SOURCE) {
    let href = m[1].trim();
    if (href.startsWith('/')) href = new URL(href, baseUrl).href;
    if (!href.startsWith('http')) continue;
    const title = m[2].replace(/<[^>]+>/g, '').trim().slice(0, 120);
    if (title.length > 5) links.push({ url: href, title });
  }
  const seen = new Set<string>();
  return links.filter(l => { if (seen.has(l.url)) return false; seen.add(l.url); return true; });
}

function extractContent(html: string): { title: string; content: string; date?: string } {
  const titleRe = new RegExp("<h1[^>]*>(.*?)</h1>", 'i');
  const titleMatch = titleRe.exec(html);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  let content = '';
  {
    const re = new RegExp("<div[^>]*class=\"[^\"]*(?:content|article|body|entry)[^\"]*\"[^>]*>(.*?)</div>", 'i');
    const match = re.exec(html);
    if (match) {
      content = match[1]
        .replace(new RegExp("<script[^>]*>.*?<\\/script>", 'gi'), '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }
  if (content.length < 200) {
    const paras = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    if (paras) content = paras.map(p => p.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(' ');
  }

  const dateRe = new RegExp("(?:date|published|posted)[\"']?\\s*[:>]\\s*[\"']?([^\"'<\\s]{4,})", 'i');
  const dateMatch = dateRe.exec(html);
  const date = dateMatch ? dateMatch[1] : undefined;

  return { title: title.slice(0, 200), content: content.slice(0, 8000), date };
}

function extractPdfLinks(html: string, baseUrl: string): { url: string; title: string }[] {
  const links: { url: string; title: string }[] = [];
  const re = new RegExp("<a[^>]+href=[\"']([^\"']+\\.pdf)[\"'][^>]*>(.*?)</a>", 'gi');
  let m;
  while ((m = re.exec(html)) !== null && links.length < MAX_PAGES_PER_SOURCE) {
    let href = m[1].trim();
    if (href.startsWith('/')) href = new URL(href, baseUrl).href;
    const title = m[2].replace(/<[^>]+>/g, '').trim().slice(0, 120) || 'PDF Document';
    links.push({ url: href, title });
  }
  const seen = new Set<string>();
  return links.filter(l => { if (seen.has(l.url)) return false; seen.add(l.url); return true; });
}

async function downloadPdf(url: string, outputDir: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const filename = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.pdf`;
    const outPath = path.join(outputDir, filename);
    writeFileSync(outPath, buf);
    return outPath;
  } catch { return null; }
}

function runPdfExtractor(pdfPath: string): Promise<string[]> {
  return new Promise((resolve) => {
    const proc = spawn('python3', ['/a0/usr/projects/prepx/scripts/extract_pdf.py', pdfPath]);
    let stdout = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.on('close', () => {
      try {
        const parsed = JSON.parse(stdout);
        if (parsed.ok) resolve(parsed.chunks.map((c: any) => c.text));
        else resolve([]);
      } catch { resolve([]); }
    });
  });
}

export async function scrapeSource(sourceId: string): Promise<ScrapedArticle[]> {
  const source = SOURCE_REGISTRY.find(s => s.id === sourceId);
  if (!source || !source.enabled) return [];

  if (!existsSync(SCRAPE_OUTPUT_DIR)) mkdirSync(SCRAPE_OUTPUT_DIR, { recursive: true });

  const results: ScrapedArticle[] = [];

  const fetcher = source.type === 'playwright' ? playwrightFetch : directFetch;
  const { html, ok } = await fetcher(source.baseUrl);
  if (!ok) return [{ sourceId, sourceName: source.name, url: source.baseUrl, title: 'Scrape failed', content: 'Could not fetch listing page. Site may require login or block bots.', type: 'article' }];

  if (source.type === 'pdf-list') {
    const pdfs = extractPdfLinks(html, source.baseUrl);
    for (const pdf of pdfs) {
      const pdfPath = await downloadPdf(pdf.url, SCRAPE_OUTPUT_DIR);
      if (pdfPath) {
        const chunks = await runPdfExtractor(pdfPath);
        results.push({ sourceId, sourceName: source.name, url: pdf.url, title: pdf.title, content: chunks.join('\n\n'), type: 'pdf', pdfPath, chunks });
      }
    }
  } else {
    const links = extractLinks(html, source.baseUrl);
    for (const link of links.slice(0, MAX_PAGES_PER_SOURCE)) {
      const { html: articleHtml, ok: articleOk } = await fetcher(link.url);
      if (!articleOk) continue;
      const extracted = extractContent(articleHtml);
      if (extracted.content.length > 200) {
        results.push({ sourceId, sourceName: source.name, url: link.url, title: extracted.title || link.title, content: extracted.content, date: extracted.date, type: 'article' });
      }
    }
  }

  return results;
}

export async function scrapeAll(): Promise<ScrapedArticle[]> {
  const all: ScrapedArticle[] = [];
  for (const source of SOURCE_REGISTRY.filter(s => s.enabled)) {
    try {
      const articles = await scrapeSource(source.id);
      all.push(...articles);
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.error(`[Scraper] Failed ${source.id}:`, e);
    }
  }
  return all;
}
