import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { CONFIG } from "../config";
import { DetailedJob } from "../types";

puppeteer.use(StealthPlugin());

export async function scrapeIndeed(query: string, location?: string): Promise<DetailedJob[]> {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=VizDisplayCompositor'
    ],
    ignoreDefaultArgs: ['--enable-automation'],
    defaultViewport: { width: 1366, height: 768 }
  });

  const page = await browser.newPage();
  try {
    const q = encodeURIComponent(query);
    const l = location ? `&l=${encodeURIComponent(location)}` : "";
    const timeFilter = `&fromage=${CONFIG.TIME_FILTER_DAYS}`;
    const url = `https://in.indeed.com/jobs?q=${q}${l}${timeFilter}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Extract from listing cards (avoids many interstitial/verification pages)
    const listingResults: DetailedJob[] = await page.evaluate(() => {
      const out: any[] = [];
      const cards = Array.from(document.querySelectorAll('[data-testid="jobCard"], .job_seen_beacon'));
      for (const card of cards.slice(0, 50)) {
        const titleA = (card.querySelector('a[role="link"][data-testid="jobTitle"]') || card.querySelector('a[data-jk], a[href*="/viewjob"]')) as HTMLAnchorElement | null;
        const companyEl = card.querySelector('[data-testid="companyName"], .companyName a, .companyName') as HTMLElement | null;
        const locEl = card.querySelector('[data-testid="text-location"], .companyLocation') as HTMLElement | null;
        const href = titleA?.href || undefined;
        const title = (titleA?.textContent || '').trim();
        if (!href || !title) continue;
        out.push({
          source: 'Indeed',
          scrapedAt: new Date().toISOString(),
          url: href,
          title,
          company: companyEl?.textContent?.trim() || undefined,
          location: locEl?.textContent?.trim() || undefined
        });
      }
      return out as any;
    });

    const results: DetailedJob[] = [];
    // Enrich top N results by visiting detail pages, limited by SCRAPE_LIMIT
    const limitedResults = listingResults.slice(0, CONFIG.SCRAPE_LIMIT);
    for (const item of limitedResults) {
      try {
        const jobPage = await browser.newPage();
        await jobPage.goto(item.url!, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await jobPage.waitForTimeout(2000);
        const enriched = await jobPage.evaluate((base) => {
          const out: any = { ...base };
          const h1 = document.querySelector('h1') || document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]');
          if (h1 && h1.textContent) out.title = h1.textContent.trim();
          const companySel = document.querySelector('[data-testid="companyName"]') || document.querySelector('.jobsearch-CompanyInfoWithoutHeaderImage div a');
          if (companySel && companySel.textContent) out.company = companySel.textContent.trim();
          const locSel = document.querySelector('[data-testid="jobsearch-JobInfoHeader-companyLocation"]') || document.querySelector('.jobsearch-JobInfoHeader-subtitle');
          if (locSel && locSel.textContent) out.location = locSel.textContent.trim();
          const descSel = document.querySelector('#jobDescriptionText') || document.querySelector('[data-testid="jobDescriptionText"]');
          if (descSel && descSel.textContent) {
            const desc = descSel.textContent.trim();
            out.roleOverview = desc.split('\n').filter(p => p.trim().length > 50)[0] || undefined;
            const lines = desc.split('\n').map(s => s.trim()).filter(Boolean);
            const bullets = lines.filter(l => l.startsWith('•') || l.startsWith('-') || l.length > 20);
            out.responsibilities = bullets.slice(0, 5);
            out.requirements = bullets.slice(0, 5);
          }
          const apply = document.querySelector('a[aria-label*="Apply"], a[href*="/apply/"]') as HTMLAnchorElement;
          if (apply && apply.href) out.applyLink = apply.href;
          return out;
        }, item as any);
        results.push(enriched);
        await jobPage.close();
        await new Promise(r => setTimeout(r, 500));
      } catch {
        results.push(item);
      }
    }

    await browser.close();
    return results;
  } catch (e) {
    await browser.close();
    throw e;
  }
}


