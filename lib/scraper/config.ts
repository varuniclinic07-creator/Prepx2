export interface SourceConfig {
  id: string;
  name: string;
  baseUrl: string;
  type: ' direct' | 'playwright' | 'rss' | 'pdf-list';
  selectors?: {
    articleLinks?: string;
    title?: string;
    content?: string;
    date?: string;
    pdfLinks?: string;
  };
  enabled: boolean;
}

export const SOURCE_REGISTRY: SourceConfig[] = [
  {
    id: 'pib',
    name: 'PIB Press Releases',
    baseUrl: 'https://pib.gov.in/Allrel.aspx',
    type: ' direct',
    selectors: { articleLinks: 'a[href*="PressReleasePage"]', title: '.title', content: '.content', date: '.date' },
    enabled: true,
  },
  {
    id: 'nextias-yojana',
    name: 'NextIAS Yojana Magazine',
    baseUrl: 'https://www.nextias.com/yojana-down-to-earth/yojana',
    type: 'pdf-list',
    selectors: { pdfLinks: 'a[href$=".pdf"]' },
    enabled: true,
  },
  {
    id: 'nextias-kurukshetra',
    name: 'NextIAS Kurukshetra Magazine',
    baseUrl: 'https://www.nextias.com/yojana-down-to-earth/kurukshetra',
    type: 'pdf-list',
    selectors: { pdfLinks: 'a[href$=".pdf"]' },
    enabled: true,
  },
  {
    id: 'drishti-prelims',
    name: 'DrishtiIAS Prelims',
    baseUrl: 'https://www.drishtiias.com/prelims/',
    type: 'playwright',
    selectors: { articleLinks: 'article a', title: 'h1', content: '.content-area', date: '.date' },
    enabled: true,
  },
  {
    id: 'drishti-mains',
    name: 'DrishtiIAS Mains',
    baseUrl: 'https://www.drishtiias.com/mains/',
    type: 'playwright',
    selectors: { articleLinks: 'article a', title: 'h1', content: '.content-area', date: '.date' },
    enabled: true,
  },
  {
    id: 'drishti-arc',
    name: 'DrishtiIAS ARC Reports',
    baseUrl: 'https://www.drishtiias.com/summary-of-important-reports',
    type: 'playwright',
    selectors: { articleLinks: '.report-list a', title: 'h1', content: '.report-content', date: '.date' },
    enabled: true,
  },
  {
    id: 'iasscore-ca',
    name: 'IAS Score Current Affairs',
    baseUrl: 'https://iasscore.in/current-affairs',
    type: ' direct',
    selectors: { articleLinks: '.article-list a', title: 'h1', content: '.article-content', date: '.post-date' },
    enabled: true,
  },
  {
    id: 'iasscore-mains',
    name: 'IAS Score Mains Contemporary Issues',
    baseUrl: 'https://iasscore.in/current-affairs/mains/topics/contemporary-issues',
    type: ' direct',
    selectors: { articleLinks: '.topic-list a', title: 'h1', content: '.topic-content', date: '.post-date' },
    enabled: true,
  },
  {
    id: 'visionias-mains-corner',
    name: 'VisionIAS UPSC Mains Corner',
    baseUrl: 'https://visionias.in/resources/upsc-mains-corner/',
    type: 'playwright',
    selectors: { articleLinks: '.resource-item a', title: 'h1', content: '.resource-body' },
    enabled: true,
  },
  {
    id: 'visionias-current-affairs',
    name: 'VisionIAS Current Affairs',
    baseUrl: 'https://visionias.in/current-affairs/',
    type: 'playwright',
    selectors: { articleLinks: '.ca-item a', title: 'h1', content: '.ca-body' },
    enabled: true,
  },
  {
    id: 'visionias-monthly-magazine',
    name: 'VisionIAS Monthly Magazine Archive',
    baseUrl: 'https://visionias.in/current-affairs/monthly-magazine/archive',
    type: 'playwright',
    selectors: { pdfLinks: 'a[href$=".pdf"]', articleLinks: '.magazine-item a' },
    enabled: true,
  },
  {
    id: 'visionias-quick-revision',
    name: 'VisionIAS Quick Revision Materials',
    baseUrl: 'https://visionias.in/resources/quick-revision-material/',
    type: 'playwright',
    selectors: { articleLinks: '.revision-item a', title: 'h1', content: '.revision-body' },
    enabled: true,
  },
  {
    id: 'visionias-vam1',
    name: 'VisionIAS Value Added Material',
    baseUrl: 'https://visionias.in/resources/vam.php?type=1',
    type: 'playwright',
    selectors: { articleLinks: '.vam-item a', title: 'h1', content: '.vam-body' },
    enabled: true,
  },
  {
    id: 'visionias-vam',
    name: 'VisionIAS VAM General',
    baseUrl: 'https://visionias.in/resources/vam.php',
    type: 'playwright',
    selectors: { articleLinks: '.vam-item a', title: 'h1', content: '.vam-body' },
    enabled: true,
  },
  {
    id: 'insights',
    name: 'InsightsOnIndia',
    baseUrl: 'https://www.insightsonindia.com/',
    type: 'playwright',
    selectors: { articleLinks: 'article h2 a', title: 'h1.entry-title', content: '.entry-content', date: '.entry-date' },
    enabled: true,
  },
  {
    id: 'iasbaba',
    name: 'IAS Baba',
    baseUrl: 'https://iasbaba.com/',
    type: 'playwright',
    selectors: { articleLinks: 'article h2 a', title: 'h1', content: '.entry-content', date: '.date' },
    enabled: true,
  },
  {
    id: 'shankariasparliament',
    name: 'Shankar IAS Parliament',
    baseUrl: 'https://www.shankariasparliament.com/downloads',
    type: 'pdf-list',
    selectors: { pdfLinks: 'a[href$=".pdf"]', articleLinks: '.download-item a' },
    enabled: true,
  },
  {
    id: 'gsscore',
    name: 'GSScore Current Affairs',
    baseUrl: 'https://gsscore.in/current-affairs',
    type: ' direct',
    selectors: { articleLinks: '.post-list a, .article-list a', title: 'h1.entry-title, h1.title', content: '.entry-content, .article-body', date: '.post-date, .date' },
    enabled: true,
  },
];

export const SCRAPE_OUTPUT_DIR = '/a0/tmp/prepx_downloads';
export const MAX_PAGES_PER_SOURCE = 5;
export const MAX_PDF_PAGES_EXTRACT = 15;

// ── B2-4: per-source token bucket (requests/min) and per-fetch timeout ──
// PIB tolerates more, smaller blogs less. Defaults to 10/min if not listed.
export const RATE_LIMITS: Record<string, number> & { default: number } = {
  default: 10,
  pib: 30,
  insights: 10,
  iasbaba: 10,
  'visionias-current-affairs': 10,
  'visionias-mains-corner': 10,
  'visionias-monthly-magazine': 10,
  'visionias-quick-revision': 10,
  'visionias-vam': 10,
  'visionias-vam1': 10,
  'drishti-prelims': 10,
  'drishti-mains': 10,
  'drishti-arc': 10,
  'iasscore-ca': 10,
  'iasscore-mains': 10,
  'nextias-yojana': 10,
  'nextias-kurukshetra': 10,
  shankariasparliament: 10,
  gsscore: 10,
};
export const FETCH_TIMEOUT_MS = 15_000;

// The 9 spec-named "primary" sources for the daily Hermes sweep.
// Other sources in SOURCE_REGISTRY are auxiliary and only run on manual triggers.
export const PRIMARY_SOURCE_IDS: string[] = [
  'pib',
  'nextias-yojana',
  'nextias-kurukshetra',
  'visionias-current-affairs',
  'insights',
  'iasbaba',
  'drishti-prelims',
  'iasscore-ca',
  'drishti-arc', // 2nd ARC reports
];
