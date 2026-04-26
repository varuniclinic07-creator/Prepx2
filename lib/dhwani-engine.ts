import { aiChat } from './ai-router';

// ── RSS Feed Sources for Daily Dhwani ──
const RSS_FEEDS = [
  { name: 'The Hindu', url: 'https://www.thehindu.com/news/national/?service=rss' },
  { name: 'Indian Express', url: 'https://indianexpress.com/section/india/feed/' },
  { name: 'PIB', url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1' },
];

// Simple RSS parser without external dependencies
function parseRSS(xml: string): { title: string; link: string; description: string }[] {
  const items: { title: string; link: string; description: string }[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\])?<\/title>/i);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\])?<\/description>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    const link = linkMatch ? linkMatch[1].trim() : '';
    const description = descMatch ? descMatch[1].trim() : '';
    if (title && link) items.push({ title, link, description });
  }
  return items;
}

export async function fetchNewsItems(): Promise<{ source: string; title: string; link: string; description: string }[]> {
  const all: { source: string; title: string; link: string; description: string }[] = [];
  for (const feed of RSS_FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = parseRSS(xml);
      all.push(...items.slice(0, 5).map(i => ({ source: feed.name, ...i })));
    } catch {
      // Skip failed feeds silently
    }
  }
  return all;
}

export async function generateDhwaniScript(): Promise<{ stories: any[]; script_text: string; gs_paper: string }> {
  const items = await fetchNewsItems();
  const newsText = items
    .map(i => `Source: ${i.source}\nTitle: ${i.title}\nLink: ${i.link}\nDescription: ${i.description}`)
    .join('\n\n---\n\n');

  const raw = await aiChat({
    messages: [
      {
        role: 'system',
        content:
          'You are a UPSC current affairs analyst. Extract 3 UPSC-relevant stories from the provided news items. Return ONLY valid JSON.\n\nReturn format: {"stories":[{"title":"...","source":"...","gs_paper":"GS Paper I|II|III|IV","summary":"2 paragraph summary"}],"gs_paper":"GS Paper X"}',
      },
      {
        role: 'user',
        content: `Extract 3 UPSC-relevant stories from these news items and return JSON:\n${newsText}`,
      },
    ],
    jsonMode: true,
    temperature: 0.4,
    maxTokens: 3000,
  });

  let parsed: any = { stories: [] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    // fallback to empty stories
  }

  const stories = (parsed.stories || []).slice(0, 3);
  const gsPaper = parsed.gs_paper || stories[0]?.gs_paper || 'General Studies';

  const hook = `Good morning, aspirants. This is your Daily Dhwani for ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}. Let's dive into the top 3 UPSC-relevant stories from today's headlines.`;
  const storyBlocks = stories
    .map((s: any, idx: number) => `Story ${idx + 1}: ${s.title} from ${s.source}. This relates to ${s.gs_paper}.\n\n${s.summary}`)
    .join('\n\n');
  const question = `Question for reflection: How does the first story connect with broader themes in ${gsPaper}?`;
  const outro = `That's all for today's Daily Dhwani. Keep learning, keep growing. Jai Hind!`;

  const scriptText = `${hook}\n\n${storyBlocks}\n\n${question}\n\n${outro}`;

  return { stories, script_text: scriptText, gs_paper: gsPaper };
}
