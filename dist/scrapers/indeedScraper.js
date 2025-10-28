"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeIndeed = scrapeIndeed;
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
async function scrapeIndeed(query, location) {
    const browser = await puppeteer_extra_1.default.launch({
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
        const url = `https://in.indeed.com/jobs?q=${q}${l}`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);
        // Extract from listing cards (avoids many interstitial/verification pages)
        const listingResults = await page.evaluate(() => {
            const out = [];
            const cards = Array.from(document.querySelectorAll('[data-testid="jobCard"], .job_seen_beacon'));
            for (const card of cards.slice(0, 50)) {
                const titleA = (card.querySelector('a[role="link"][data-testid="jobTitle"]') || card.querySelector('a[data-jk], a[href*="/viewjob"]'));
                const companyEl = card.querySelector('[data-testid="companyName"], .companyName a, .companyName');
                const locEl = card.querySelector('[data-testid="text-location"], .companyLocation');
                const href = titleA?.href || undefined;
                const title = (titleA?.textContent || '').trim();
                if (!href || !title)
                    continue;
                out.push({
                    source: 'Indeed',
                    scrapedAt: new Date().toISOString(),
                    url: href,
                    title,
                    company: companyEl?.textContent?.trim() || undefined,
                    location: locEl?.textContent?.trim() || undefined
                });
            }
            return out;
        });
        const results = [];
        // Enrich top N results by visiting detail pages
        for (const item of listingResults.slice(0, 20)) {
            try {
                const jobPage = await browser.newPage();
                await jobPage.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await jobPage.waitForTimeout(2000);
                const enriched = await jobPage.evaluate((base) => {
                    const out = { ...base };
                    const h1 = document.querySelector('h1') || document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]');
                    if (h1 && h1.textContent)
                        out.title = h1.textContent.trim();
                    const companySel = document.querySelector('[data-testid="companyName"]') || document.querySelector('.jobsearch-CompanyInfoWithoutHeaderImage div a');
                    if (companySel && companySel.textContent)
                        out.company = companySel.textContent.trim();
                    const locSel = document.querySelector('[data-testid="jobsearch-JobInfoHeader-companyLocation"]') || document.querySelector('.jobsearch-JobInfoHeader-subtitle');
                    if (locSel && locSel.textContent)
                        out.location = locSel.textContent.trim();
                    const descSel = document.querySelector('#jobDescriptionText') || document.querySelector('[data-testid="jobDescriptionText"]');
                    if (descSel && descSel.textContent) {
                        const desc = descSel.textContent.trim();
                        out.roleOverview = desc.split('\n').filter(p => p.trim().length > 50)[0] || undefined;
                        const lines = desc.split('\n').map(s => s.trim()).filter(Boolean);
                        const bullets = lines.filter(l => l.startsWith('•') || l.startsWith('-') || l.length > 20);
                        out.responsibilities = bullets.slice(0, 5);
                        out.requirements = bullets.slice(0, 5);
                    }
                    const apply = document.querySelector('a[aria-label*="Apply"], a[href*="/apply/"]');
                    if (apply && apply.href)
                        out.applyLink = apply.href;
                    return out;
                }, item);
                results.push(enriched);
                await jobPage.close();
                await new Promise(r => setTimeout(r, 500));
            }
            catch {
                results.push(item);
            }
        }
        await browser.close();
        return results;
    }
    catch (e) {
        await browser.close();
        throw e;
    }
}
//# sourceMappingURL=indeedScraper.js.map