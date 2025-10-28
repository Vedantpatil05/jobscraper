"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeLinkedInDetailed = scrapeLinkedInDetailed;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const config_1 = require("../config");
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
async function scrapeLinkedInDetailed(query, location, geoId, options = {}) {
    console.log("Starting detailed LinkedIn scraper...");
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
        // Build search URL for jobs posted in past 2 days
        const encoded = encodeURIComponent(query);
        const locationParam = location ? `&location=${encodeURIComponent(location)}` : "";
        const geoParam = geoId ? `&geoId=${encodeURIComponent(geoId)}` : "";
        const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encoded}&f_TPR=r172800${locationParam}${geoParam}`;
        console.log("Navigating to:", searchUrl);
        // Navigate to the page
        await page.goto(searchUrl, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        console.log("Page loaded, waiting for content...");
        // Wait for page to be ready
        await page.waitForTimeout(5000);
        // Extract job URLs from search results (scoped to results list and limited)
        const jobUrls = await page.evaluate((limit) => {
            // Prefer scoped selectors within the jobs results container to avoid unrelated links
            const containerSelectors = [
                '.jobs-search-results-list',
                '.jobs-search-results__list',
                '.two-pane-serp-page__results-list',
                'ul.scaffold-layout__list-container'
            ];
            let anchors = [];
            for (const containerSel of containerSelectors) {
                const container = document.querySelector(containerSel);
                if (container) {
                    const found = Array.from(container.querySelectorAll("a[href*='/jobs/view/']"));
                    anchors = found;
                    if (anchors.length > 0)
                        break;
                }
            }
            // Fallback to global query if containers not found
            if (anchors.length === 0) {
                anchors = Array.from(document.querySelectorAll("a[href*='/jobs/view/']"));
            }
            // Map to hrefs, dedupe, and enforce limit
            const hrefs = Array.from(new Set(anchors.map(a => a.href).filter(Boolean)));
            return hrefs.slice(0, Math.max(1, limit));
        }, Math.max(1, Math.min(config_1.CONFIG.SCRAPE_LIMIT || 10, 50)));
        console.log(`Found ${jobUrls.length} job URLs to scrape`);
        const detailedJobs = [];
        // Prepare simple matcher from query to validate relevance by job title
        const q = (query || "").toLowerCase().trim();
        const queryTokens = Array.from(new Set(q.split(/\s+/).filter(Boolean)));
        // Common variants map to catch spelling/wording differences (e.g., frontend vs front end)
        const variantTokens = new Set(queryTokens);
        if (q.includes("frontend") || q.includes("front end") || q.includes("front-end")) {
            variantTokens.add("frontend");
            variantTokens.add("front end");
            variantTokens.add("front-end");
        }
        // Visit each job page to get detailed information
        for (let i = 0; i < jobUrls.length; i++) {
            const jobUrl = jobUrls[i];
            console.log(`Scraping job ${i + 1}/${jobUrls.length}: ${jobUrl}`);
            try {
                const jobPage = await browser.newPage();
                // Apply stealth measures
                await jobPage.evaluateOnNewDocument(() => {
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined,
                    });
                });
                await jobPage.goto(jobUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });
                await jobPage.waitForTimeout(3000);
                // Extract detailed job information
                const jobDetails = await jobPage.evaluate(() => {
                    const job = {
                        source: "LinkedIn",
                        scrapedAt: new Date().toISOString(),
                        url: window.location.href
                    };
                    // Extract job ID from URL
                    const urlMatch = window.location.href.match(/\/jobs\/view\/(\d+)/);
                    if (urlMatch) {
                        job.jobId = urlMatch[1];
                    }
                    // Extract title
                    const titleSelectors = [
                        'h1.top-card-layout__title',
                        '.topcard__title',
                        'h1.job-title',
                        'h1',
                        '.job-details-jobs-unified-top-card__job-title'
                    ];
                    for (const selector of titleSelectors) {
                        const element = document.querySelector(selector);
                        if (element && element.textContent) {
                            job.title = element.textContent.trim();
                            break;
                        }
                    }
                    // Extract company
                    const companySelectors = [
                        'a.topcard__org-name-link',
                        '.topcard__org-name-link',
                        '.topcard__company-name',
                        '.topcard__company-info a',
                        '.job-details-jobs-unified-top-card__company-name a'
                    ];
                    for (const selector of companySelectors) {
                        const element = document.querySelector(selector);
                        if (element && element.textContent) {
                            job.company = element.textContent.trim();
                            break;
                        }
                    }
                    // Extract location
                    const locationSelectors = [
                        '.topcard__flavor--bullet',
                        '.topcard__flavor--metadata',
                        '.job-location',
                        '.topcard__flavor',
                        '.job-details-jobs-unified-top-card__bullet'
                    ];
                    for (const selector of locationSelectors) {
                        const element = document.querySelector(selector);
                        if (element && element.textContent) {
                            job.location = element.textContent.trim();
                            break;
                        }
                    }
                    // Extract posted date
                    const postedSelectors = [
                        'span.posted-time-ago__text',
                        '.posted-date',
                        '.topcard__flavor--metadata',
                        '.job-details-jobs-unified-top-card__posted-date'
                    ];
                    for (const selector of postedSelectors) {
                        const element = document.querySelector(selector);
                        if (element && element.textContent) {
                            job.howRecent = element.textContent.trim();
                            break;
                        }
                    }
                    // Extract employment type
                    const employmentSelectors = [
                        '.job-details-jobs-unified-top-card__job-insight',
                        '.topcard__flavor--metadata'
                    ];
                    for (const selector of employmentSelectors) {
                        const element = document.querySelector(selector);
                        if (element && element.textContent) {
                            const text = element.textContent.trim();
                            if (text.includes('Full-time') || text.includes('Part-time') || text.includes('Contract') || text.includes('Remote')) {
                                job.employmentType = text;
                                break;
                            }
                        }
                    }
                    // Extract apply link
                    const applySelectors = [
                        'a[data-tracking-control-name="apply_button"]',
                        'a.apply-button',
                        'a.topcard__apply-link',
                        '.job-details-jobs-unified-top-card__apply-button'
                    ];
                    for (const selector of applySelectors) {
                        const element = document.querySelector(selector);
                        if (element && element.href) {
                            job.applyLink = element.href;
                            break;
                        }
                    }
                    // Extract job description and details
                    const descriptionSelectors = [
                        '.description__text',
                        '.description',
                        '#job-details',
                        '.jobs-description__container',
                        '.show-more-less-html__markup',
                        '.jobs-description-content__text'
                    ];
                    let description = '';
                    for (const selector of descriptionSelectors) {
                        const element = document.querySelector(selector);
                        if (element && element.textContent) {
                            description = element.textContent.trim();
                            break;
                        }
                    }
                    // Parse description for structured data
                    if (description) {
                        // Extract role overview (first paragraph)
                        const paragraphs = description.split('\n').filter(p => p.trim().length > 50);
                        if (paragraphs.length > 0) {
                            job.roleOverview = paragraphs[0].trim();
                        }
                        // Extract responsibilities
                        const responsibilities = [];
                        const respKeywords = ['responsibilities:', 'what you\'ll do:', 'key responsibilities:', 'you will:'];
                        for (const keyword of respKeywords) {
                            const respMatch = description.toLowerCase().indexOf(keyword);
                            if (respMatch !== -1) {
                                const respSection = description.substring(respMatch).split('\n').slice(0, 10);
                                respSection.forEach(line => {
                                    const trimmed = line.trim();
                                    if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*') ||
                                        (trimmed.length > 20 && trimmed.length < 200)) {
                                        responsibilities.push(trimmed.replace(/^[•\-*]\s*/, ''));
                                    }
                                });
                                break;
                            }
                        }
                        if (responsibilities.length > 0) {
                            job.responsibilities = responsibilities.slice(0, 5); // Limit to 5
                        }
                        // Extract requirements
                        const requirements = [];
                        const reqKeywords = ['requirements:', 'qualifications:', 'what we\'re looking for:', 'you have:'];
                        for (const keyword of reqKeywords) {
                            const reqMatch = description.toLowerCase().indexOf(keyword);
                            if (reqMatch !== -1) {
                                const reqSection = description.substring(reqMatch).split('\n').slice(0, 10);
                                reqSection.forEach(line => {
                                    const trimmed = line.trim();
                                    if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*') ||
                                        (trimmed.length > 20 && trimmed.length < 200)) {
                                        requirements.push(trimmed.replace(/^[•\-*]\s*/, ''));
                                    }
                                });
                                break;
                            }
                        }
                        if (requirements.length > 0) {
                            job.requirements = requirements.slice(0, 5); // Limit to 5
                        }
                        // Determine seniority level
                        const seniorityKeywords = {
                            'senior': 'Senior',
                            'lead': 'Senior',
                            'principal': 'Senior',
                            'junior': 'Junior',
                            'entry': 'Junior',
                            'mid': 'Mid-Level',
                            'intermediate': 'Mid-Level'
                        };
                        for (const [keyword, level] of Object.entries(seniorityKeywords)) {
                            if (description.toLowerCase().includes(keyword)) {
                                job.seniorityLevel = level;
                                break;
                            }
                        }
                    }
                    // Extract company logo
                    const logoSelectors = [
                        '.topcard__org-name-link img',
                        '.company-logo img',
                        '.job-details-jobs-unified-top-card__company-logo img'
                    ];
                    for (const selector of logoSelectors) {
                        const element = document.querySelector(selector);
                        if (element && element.src) {
                            job.companyLogo = element.src;
                            break;
                        }
                    }
                    return job;
                });
                // Relevance filter: keep only if job title matches query intent
                const titleLc = (jobDetails.title || "").toLowerCase();
                let matches = false;
                // If query had multiple words, require at least one meaningful token present in title
                for (const tok of Array.from(variantTokens)) {
                    if (tok.length >= 3 && titleLc.includes(tok)) {
                        matches = true;
                        break;
                    }
                }
                if (!matches) {
                    // Skip non-matching job
                    await jobPage.close();
                    await new Promise(r => setTimeout(r, 300));
                    continue;
                }
                detailedJobs.push(jobDetails);
                await jobPage.close();
                // Add delay between requests
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            catch (error) {
                console.error(`Error scraping job ${jobUrl}:`, error);
                continue;
            }
        }
        console.log(`Successfully scraped ${detailedJobs.length} detailed jobs`);
        if (options.writeToFile !== false) {
            // Save results
            const outputPath = path_1.default.resolve(config_1.CONFIG.OUTPUT_PATH);
            let existing = [];
            try {
                if (fs_1.default.existsSync(outputPath)) {
                    const raw = fs_1.default.readFileSync(outputPath, "utf-8");
                    existing = JSON.parse(raw) || [];
                }
            }
            catch (e) {
                existing = [];
            }
            const merged = existing.filter((e) => !detailedJobs.some((r) => r.jobId === e.jobId)).concat(detailedJobs);
            const dir = path_1.default.dirname(outputPath);
            if (!fs_1.default.existsSync(dir))
                fs_1.default.mkdirSync(dir, { recursive: true });
            fs_1.default.writeFileSync(outputPath, JSON.stringify(merged, null, 2), "utf-8");
            console.log(`Saved ${detailedJobs.length} new detailed jobs to ${outputPath}`);
        }
        await browser.close();
        return detailedJobs;
    }
    catch (error) {
        console.error("Error in detailed scraper:", error);
        await browser.close();
        throw error;
    }
}
//# sourceMappingURL=detailedLinkedInScraper.js.map