import { scrapeAll, scrapeSource, ScrapedArticle } from './engine';
import { generateFromScrapedText, findClosestTopic, upsertTopicContent } from './ai-processor';
import { SOURCE_REGISTRY } from './config';

export interface PipelineResult {
  totalScraped: number;
  totalGenerated: number;
  totalUpdated: number;
  errors: string[];
  logs: string[];
}

export async function runPipeline(
  sourceId?: string,
  regenerateAll: boolean = false
): Promise<PipelineResult> {
  const result: PipelineResult = { totalScraped: 0, totalGenerated: 0, totalUpdated: 0, errors: [], logs: [] };

  const log = (msg: string) => { result.logs.push(msg); console.log(`[Pipeline] ${msg}`); };
  const err = (msg: string) => { result.errors.push(msg); console.error(`[Pipeline] ${msg}`); };

  // Step 1: Scrape
  log('Phase 1: Scraping sources...');
  let articles: ScrapedArticle[] = [];
  try {
    articles = sourceId ? await scrapeSource(sourceId) : await scrapeAll();
    result.totalScraped = articles.length;
    log(`Scraped ${articles.length} articles`);
  } catch (e: any) {
    err(`Scrape failed: ${e.message}`);
    return result;
  }

  // Step 2: Process each article
  log('Phase 2: AI enrichment (EN + HI)...');
  for (const article of articles) {
    if (article.type === 'article' && article.content.length < 300) continue;
    if (article.title === 'Scrape failed') continue;

    try {
      // Find closest topic via vector search
      const closest = await findClosestTopic(article.content);
      if (!closest && !regenerateAll) {
        log(`No topic match for "${article.title.slice(0, 50)}" — skipping`);
        continue;
      }

      // Determine target topic
      let topicTitle = article.title;
      let topicId = closest?.id;
      let syllabusTag = 'GS2-POL-L01';
      let subject = 'polity';

      if (!topicId) {
        topicTitle = article.title;
        // Default to Polity if no match
        topicId = `generated-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      } else {
        // Extract subject from title patterns
        subject = article.sourceId.includes('yojana') || article.sourceId.includes('kurukshetra')
          ? 'polity'
          : 'economy';
        syllabusTag = `${subject.startsWith('GS') ? subject : 'GS2-POL'}-L99`;
      }

      // Generate enriched content with Hindi translation
      log(`Generating for: ${topicTitle.slice(0, 60)}...`);
      const bilingual = await generateFromScrapedText(
        article.content,
        topicTitle,
        syllabusTag,
        article.url
      );

      result.totalGenerated++;

      // Upsert into topics table
      if (topicId) {
        const ok = await upsertTopicContent(topicId, bilingual, syllabusTag, subject);
        if (ok) result.totalUpdated++;
        else err(`Failed to update topic: ${topicId}`);
      }
    } catch (e: any) {
      err(`Processing "${article.title.slice(0, 40)}" failed: ${e.message}`);
    }
  }

  log(`Pipeline complete. Generated: ${result.totalGenerated}, Updated: ${result.totalUpdated}`);
  return result;
}
