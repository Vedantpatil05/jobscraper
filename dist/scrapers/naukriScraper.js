"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeNaukri = scrapeNaukri;
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
async function scrapeNaukri(query, location) {
    console.log("Starting Naukri scraper...");
    const browser = await puppeteer_extra_1.default.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=VizDisplayCompositor',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: { width: 1366, height: 768 }
    });
    const page = await browser.newPage();
    try {
        // Remove webdriver property
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
        });
        // Build proper Naukri URL
        const q = encodeURIComponent(query.replace(/\s+/g, '-'));
        const locParam = location ? encodeURIComponent(location) : "";
        const url = `https://www.naukri.com/${q}-jobs${locParam ? `-${locParam}` : ""}`;
        console.log("Navigating to:", url);
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForTimeout(5000);
        console.log("Page loaded, extracting job listings...");
        // Updated selectors for Naukri's current structure
        const listings = await page.evaluate(() => {
            const out = [];
            // Try multiple selector patterns for job cards
            const selectors = [
                '.srp-jobtuple-wrapper',
                '.jobTuple',
                '.job-card',
                '.jobTupleHeader',
                '[class*="jobTuple"]',
                '[class*="job-card"]',
                'article',
                '.srp-jobtuple'
            ];
            let cards = [];
            for (const selector of selectors) {
                const found = Array.from(document.querySelectorAll(selector));
                if (found.length > 0) {
                    cards = found;
                    console.log(`Found ${cards.length} job cards using selector: ${selector}`);
                    break;
                }
            }
            if (cards.length === 0) {
                console.log("No job cards found with any selector");
                return out;
            }
            for (const card of cards.slice(0, 50)) {
                try {
                    // Try multiple selectors for title and link
                    const titleSelectors = [
                        'a.title.fw500.ellipsis',
                        'a.title',
                        '.title a',
                        'h2 a',
                        '.jobTupleHeader a',
                        'a[href*="/jobview/"]',
                        'a[href*="/job-detail/"]'
                    ];
                    let titleA = null;
                    for (const selector of titleSelectors) {
                        titleA = card.querySelector(selector);
                        if (titleA && titleA.href)
                            break;
                    }
                    // Try multiple selectors for company
                    const companySelectors = [
                        '.subTitle.ellipsis',
                        '.companyInfo .companyName a',
                        '.companyName a',
                        '.company-name',
                        '[class*="companyName"] a',
                        '[class*="company-name"]'
                    ];
                    let companyEl = null;
                    for (const selector of companySelectors) {
                        companyEl = card.querySelector(selector);
                        if (companyEl && companyEl.textContent)
                            break;
                    }
                    // Try multiple selectors for location
                    const locSelectors = [
                        '.location',
                        '.loc',
                        '.fleft.grey-text.br2.placeHolderLi',
                        '[class*="location"]',
                        '.job-location'
                    ];
                    let locEl = null;
                    for (const selector of locSelectors) {
                        locEl = card.querySelector(selector);
                        if (locEl && locEl.textContent)
                            break;
                    }
                    const href = titleA?.href || undefined;
                    const title = (titleA?.textContent || '').trim();
                    if (!href || !title) {
                        console.log("Skipping card - missing href or title");
                        continue;
                    }
                    // Ensure href is absolute
                    const absoluteHref = href.startsWith('http') ? href : `https://www.naukri.com${href}`;
                    out.push({
                        source: 'Naukri',
                        scrapedAt: new Date().toISOString(),
                        url: absoluteHref,
                        title,
                        company: companyEl?.textContent?.trim() || undefined,
                        location: locEl?.textContent?.trim() || undefined
                    });
                }
                catch (cardError) {
                    console.log("Error processing card:", cardError);
                    continue;
                }
            }
            console.log(`Extracted ${out.length} job listings`);
            return out;
        });
        if (listings.length === 0) {
            console.log("No job listings found, returning empty array");
            await browser.close();
            return [];
        }
        console.log(`Found ${listings.length} job listings, enriching details...`);
        const results = [];
        for (const item of listings.slice(0, 20)) {
            try {
                console.log(`Processing job: ${item.title}`);
                const jobPage = await browser.newPage();
                await jobPage.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await jobPage.waitForTimeout(2000);
                const enriched = await jobPage.evaluate((base) => {
                    const out = { ...base };
                    // Try multiple selectors for title
                    const titleSelectors = [
                        'h1',
                        '.jd-header h1',
                        '[itemprop=title]',
                        '.job-header h1',
                        '.title h1'
                    ];
                    for (const selector of titleSelectors) {
                        const titleSel = document.querySelector(selector);
                        if (titleSel && titleSel.textContent) {
                            out.title = titleSel.textContent.trim();
                            break;
                        }
                    }
                    // Try multiple selectors for company
                    const companySelectors = [
                        '.jd-header .jd-header-comp-name a',
                        '.jd-header .comp-name span',
                        '[itemprop=hiringOrganization]',
                        'a.company-name',
                        '.company-name a',
                        '.company-info a'
                    ];
                    for (const selector of companySelectors) {
                        const companySel = document.querySelector(selector);
                        if (companySel && companySel.textContent) {
                            out.company = companySel.textContent.trim();
                            break;
                        }
                    }
                    // Try multiple selectors for location
                    const locSelectors = [
                        '.location',
                        '.other-details .loc',
                        '[itemprop=jobLocation]',
                        '.job-location',
                        '.location-info'
                    ];
                    for (const selector of locSelectors) {
                        const locSel = document.querySelector(selector);
                        if (locSel && locSel.textContent) {
                            out.location = locSel.textContent.trim();
                            break;
                        }
                    }
                    // Try multiple selectors for job description
                    const descSelectors = [
                        '#jobDescriptionText',
                        '.dang-inner-html',
                        '.job-desc',
                        'section.job-desc',
                        '.job-description',
                        '.description',
                        '[class*="job-desc"]',
                        '[class*="description"]'
                    ];
                    for (const selector of descSelectors) {
                        const descSel = document.querySelector(selector);
                        if (descSel && descSel.textContent) {
                            const desc = descSel.textContent.trim();
                            out.roleOverview = desc.split('\n').filter(p => p.trim().length > 50)[0] || undefined;
                            const lines = desc.split('\n').map(s => s.trim()).filter(Boolean);
                            const bullets = lines.filter(l => l.startsWith('•') || l.startsWith('-') || l.length > 20);
                            out.responsibilities = bullets.slice(0, 5);
                            out.requirements = bullets.slice(0, 5);
                            break;
                        }
                    }
                    // Try multiple selectors for apply link
                    const applySelectors = [
                        'a.apply-button',
                        'a[title*="Apply"]',
                        'a[href*="/applynow"]',
                        'a.btn-apply',
                        'a[href*="/apply"]',
                        '.apply-btn'
                    ];
                    for (const selector of applySelectors) {
                        const apply = document.querySelector(selector);
                        if (apply && apply.href) {
                            out.applyLink = apply.href;
                            break;
                        }
                    }
                    return out;
                }, item);
                results.push(enriched);
                await jobPage.close();
                await new Promise(r => setTimeout(r, 500));
            }
            catch (jobError) {
                console.log(`Error processing job ${item.title}:`, jobError);
                results.push(item);
            }
        }
        console.log(`Successfully processed ${results.length} jobs`);
        await browser.close();
        return results;
    }
    catch (e) {
        console.error("Error in Naukri scraper:", e);
        await browser.close();
        throw e;
    }
}
//# sourceMappingURL=naukriScraper.js.map