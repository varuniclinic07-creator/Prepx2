import { SOURCE_REGISTRY, SCRAPE_OUTPUT_DIR, MAX_PAGES_PER_SOURCE, RATE_LIMITS, FETCH_TIMEOUT_MS } from './config';
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

// ── structured log (pino-shaped, console-backed; pino dep is optional) ──
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
function log(level: LogLevel, evt: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, mod: 'scraper', evt, ...fields });
  // eslint-disable-next-line no-console
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

// ── per-source token bucket ──
// Bucket is refilled at `permitsPerMin/60` tokens per second up to `permitsPerMin`.
interface Bucket { tokens: number; updatedAt: number; capacity: number; perSec: number; }
const buckets: Map<string, Bucket> = new Map();

function bucketFor(sourceId: string): Bucket {
  let b = buckets.get(sourceId);
  if (!b) {
    const perMin = RATE_LIMITS[sourceId] ?? RATE_LIMITS.default;
    b = { tokens: perMin, capacity: perMin, perSec: perMin / 60, updatedAt: Date.now() };
    buckets.set(sourceId, b);
  }
  return b;
}

async function acquireToken(sourceId: string): Promise<void> {
  const b = bucketFor(sourceId);
  while (true) {
    const now = Date.now();
    const elapsed = (now - b.updatedAt) / 1000;
    b.tokens = Math.min(b.capacity, b.tokens + elapsed * b.perSec);
    b.updatedAt = now;
    if (b.tokens >= 1) { b.tokens -= 1; return; }
    const waitMs = Math.ceil(((1 - b.tokens) / b.perSec) * 1000);
    await new Promise(r => setTimeout(r, Math.min(waitMs, 2000)));
  }
}

// ── per-source circuit breaker ──
// Opens after 5 consecutive failures, cools 5min, then HALF_OPEN — one probe.
interface Breaker { state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'; failures: number; openedAt: number; }
const breakers: Map<string, Breaker> = new Map();
const BREAKER_THRESHOLD = 5;
const BREAKER_COOLDOWN_MS = 5 * 60 * 1000;

function breakerFor(sourceId: string): Breaker {
  let br = breakers.get(sourceId);
  if (!br) { br = { state: 'CLOSED', failures: 0, openedAt: 0 }; breakers.set(sourceId, br); }
  if (br.state === 'OPEN' && Date.now() - br.openedAt > BREAKER_COOLDOWN_MS) {
    br.state = 'HALF_OPEN';
    log('info', 'breaker_half_open', { sourceId });
  }
  return br;
}

function recordSuccess(sourceId: string) {
  const br = breakerFor(sourceId);
  if (br.state !== 'CLOSED') log('info', 'breaker_closed', { sourceId });
  br.state = 'CLOSED'; br.failures = 0; br.openedAt = 0;
}

function recordFailure(sourceId: string, reason: string) {
  const br = breakerFor(sourceId);
  br.failures += 1;
  if (br.state === 'HALF_OPEN' || br.failures >= BREAKER_THRESHOLD) {
    br.state = 'OPEN'; br.openedAt = Date.now();
    log('warn', 'breaker_opened', { sourceId, failures: br.failures, reason });
  }
}

export function isCircuitOpen(sourceId: string): boolean {
  return breakerFor(sourceId).state === 'OPEN';
}

async function directFetch(url: string, sourceId: string, attempt = 0): Promise<{ html: string; ok: boolean; reason?: string }> {
  if (isCircuitOpen(sourceId)) {
    return { html: '', ok: false, reason: 'circuit_open' };
  }
  await acquireToken(sourceId);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PrepXBot/1.0; +https://prepx.app/bot)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    if (html.includes('cf-browser-verification') || html.includes('challenge-platform') || html.includes('Checking your browser')) {
      log('warn', 'captcha_detected', { sourceId, url });
      recordFailure(sourceId, 'captcha');
      return { html, ok: false, reason: 'captcha' };
    }
    recordSuccess(sourceId);
    return { html, ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (attempt < 3) {
      const delay = 1000 * Math.pow(2, attempt);
      log('warn', 'fetch_retry', { sourceId, url, attempt: attempt + 1, delay, error: msg });
      await new Promise(r => setTimeout(r, delay));
      return directFetch(url, sourceId, attempt + 1);
    }
    log('error', 'fetch_failed_terminal', { sourceId, url, error: msg });
    recordFailure(sourceId, msg);
    return { html: '', ok: false, reason: msg };
  }
}

async function playwrightFetch(url: string, sourceId: string): Promise<{ html: string; ok: boolean; reason?: string }> {
  if (isCircuitOpen(sourceId)) return { html: '', ok: false, reason: 'circuit_open' };
  await acquireToken(sourceId);
  try {
    // @ts-ignore — playwright is an optional/runtime dep
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: FETCH_TIMEOUT_MS });
    const html = await page.content();
    await browser.close();
    recordSuccess(sourceId);
    return { html, ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    log('error', 'playwright_failed', { sourceId, url, error: msg });
    recordFailure(sourceId, msg);
    return { html: '', ok: false, reason: msg };
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

  const fetcher = source.type === 'playwright'
    ? (url: string) => playwrightFetch(url, sourceId)
    : (url: string) => directFetch(url, sourceId);
  const { html, ok, reason } = await fetcher(source.baseUrl);
  if (!ok) {
    log('warn', 'listing_fetch_failed', { sourceId, baseUrl: source.baseUrl, reason });
    return [{ sourceId, sourceName: source.name, url: source.baseUrl, title: 'Scrape failed', content: `Could not fetch listing page (${reason ?? 'unknown'}).`, type: 'article' }];
  }

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

  log('info', 'source_scraped', { sourceId, count: results.length });
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
