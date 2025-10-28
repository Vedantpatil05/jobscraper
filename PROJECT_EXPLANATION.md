# LinkedIn Job Scraper - Complete Project Explanation

## 🎯 **Project Overview**
This is a LinkedIn job scraper that automatically finds and extracts detailed job information posted in the past 2 days. It saves all data in a structured JSON format for easy integration with other systems.

## 📁 **Project Structure**

```
linkscrap/
├── src/
│   ├── index.ts                           # Main entry point
│   ├── config.ts                          # Configuration settings
│   ├── scrapers/
│   │   └── detailedLinkedInScraper.ts     # Core scraping logic
│   └── utils/
│       ├── browser.ts                     # Browser setup
│       └── helpers.ts                     # Utility functions
├── data/
│   └── linkedin_jobs.json                # Output file (generated)
└── package.json                          # Dependencies
```

---

## 📄 **File-by-File Explanation**

### 1. **src/index.ts** - Main Entry Point
**Purpose:** This is the starting point of our application.

**What it does:**
- Takes command line arguments for job search query
- Calls the main scraping function
- Displays results to user
- Handles errors gracefully

**Key Logic:**
```typescript
const query = process.argv.slice(2).join(" ") || "software developer";
```
- Gets search term from command line (e.g., `npm run dev "frontend developer"`)
- If no search term provided, defaults to "software developer"

**How to modify:**
- Change default search term: Modify the fallback string
- Add more search terms: Use array of queries and loop through them
- Add logging: Insert console.log statements for debugging

---

### 2. **src/config.ts** - Configuration Settings
**Purpose:** Centralized configuration for all settings.

**What it contains:**
- Scraping limits (how many jobs to scrape)
- Delay settings (time between requests)
- Output file path
- Browser settings

**Key Settings:**
```typescript
SCRAPE_LIMIT: Number(process.env.SCRAPE_LIMIT || 20),     // Max jobs to scrape
DELAY_MIN_MS: Number(process.env.DELAY_MIN_MS || 2000),   // Min delay between requests
DELAY_MAX_MS: Number(process.env.DELAY_MAX_MS || 4000),   // Max delay between requests
OUTPUT_PATH: process.env.OUTPUT_PATH || path.join(__dirname, "../data/linkedin_jobs.json")
```

**How to modify:**
- **Change scraping limit:** Modify `SCRAPE_LIMIT` value
- **Adjust delays:** Change `DELAY_MIN_MS` and `DELAY_MAX_MS` for faster/slower scraping
- **Change output location:** Modify `OUTPUT_PATH`
- **Add new settings:** Add new properties to CONFIG object

---

### 3. **src/scrapers/detailedLinkedInScraper.ts** - Core Scraping Logic
**Purpose:** This is the heart of our scraper - it does all the heavy lifting.

#### **Main Function: `scrapeLinkedInDetailed(query: string)`**

**Step 1: Browser Setup**
```typescript
const browser = await puppeteer.launch({
  headless: "new",                    // Run browser invisibly
  args: [...],                        // Anti-detection settings
  ignoreDefaultArgs: ['--enable-automation']  // Hide automation
});
```
- Launches a browser with stealth settings
- Prevents LinkedIn from detecting automation

**Step 2: Search URL Construction**
```typescript
const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encoded}&f_TPR=r172800`;
```
- `keywords=${encoded}`: Your search term (URL encoded)
- `f_TPR=r172800`: LinkedIn's date filter for past 48 hours (2 days)

**How to modify date filter:**
- Past 24 hours: `f_TPR=r86400`
- Past week: `f_TPR=r604800`
- Past month: `f_TPR=r2592000`
- Remove date filter: Remove `&f_TPR=r172800`

**Step 3: Job URL Extraction**
```typescript
const jobUrls = await page.evaluate(() => {
  const links = Array.from(document.querySelectorAll('a'));
  const jobLinks = links.filter(link => 
    link.href && link.href.includes('/jobs/view/') && link.textContent && link.textContent.trim().length > 5
  );
  return jobLinks.map(link => link.href).slice(0, 10);
});
```
- Finds all job links on the search page
- Filters for actual job postings
- Limits to first 10 jobs (configurable)

**Step 4: Individual Job Scraping**
For each job URL, the scraper:
1. Opens a new browser page
2. Navigates to the job page
3. Extracts detailed information using multiple selectors
4. Closes the page and moves to next job

**Data Extraction Logic:**
```typescript
// Job Title Extraction
const titleSelectors = [
  'h1.top-card-layout__title',
  '.topcard__title',
  'h1.job-title',
  'h1',
  '.job-details-jobs-unified-top-card__job-title'
];
```

**How to modify extraction:**
- **Add new fields:** Add new selectors and extraction logic
- **Change selectors:** Update CSS selectors if LinkedIn changes their layout
- **Modify parsing:** Change how responsibilities/requirements are extracted

---

### 4. **src/utils/browser.ts** - Browser Configuration
**Purpose:** Sets up the browser with anti-detection measures.

**Key Settings:**
```typescript
const launchArgs: string[] = [
  "--no-sandbox",                                    // Security settings
  "--disable-setuid-sandbox",
  "--disable-blink-features=AutomationControlled",   // Hide automation
  "--disable-features=VizDisplayCompositor",
  "--user-agent=Mozilla/5.0..."                     // Realistic user agent
];
```

**How to modify:**
- **Change user agent:** Update the user-agent string
- **Add proxy:** Add `--proxy-server=your-proxy` to launchArgs
- **Enable headless mode:** Change `headless: false` to `headless: "new"`

---

### 5. **src/utils/helpers.ts** - Utility Functions
**Purpose:** Contains helper functions for delays, user agents, and retry logic.

**Key Functions:**
- `randomDelay(min, max)`: Adds random delays between requests
- `pickUserAgent()`: Generates realistic user agent strings
- `retry(fn, maxAttempts, delayMs)`: Retries failed operations

---

## 🔧 **How Query Formation Works**

### **Search URL Structure:**
```
https://www.linkedin.com/jobs/search?keywords=SEARCH_TERM&f_TPR=TIME_FILTER&location=LOCATION
```

**Parameters:**
- `keywords`: Your job search term (URL encoded)
- `f_TPR`: Time filter (how recent)
- `location`: Geographic location (optional)

**Examples:**
```typescript
// Frontend developer jobs in past 2 days
"https://www.linkedin.com/jobs/search?keywords=frontend%20developer&f_TPR=r172800"

// Software engineer jobs in past week
"https://www.linkedin.com/jobs/search?keywords=software%20engineer&f_TPR=r604800"

// Data scientist jobs in past 24 hours
"https://www.linkedin.com/jobs/search?keywords=data%20scientist&f_TPR=r86400"
```

---

## 📊 **Data Output Format**

**JSON Structure:**
```json
{
  "jobId": "4305402862",
  "source": "LinkedIn",
  "title": "Frontend Software Developer",
  "company": "Tekmon",
  "companyLogo": "https://media.licdn.com/company/logo.png",
  "location": "United States",
  "timezone": "At least 4 hours overlap with PST",
  "employmentType": "Full-time, Remote",
  "postedDate": "2025-09-26",
  "applyLink": "https://www.linkedin.com/jobs/view/...",
  "aboutCompany": "Company description...",
  "roleOverview": "Job description...",
  "responsibilities": ["Responsibility 1", "Responsibility 2"],
  "requirements": ["Requirement 1", "Requirement 2"],
  "seniorityLevel": "Senior",
  "howRecent": "2 hours ago",
  "scrapedAt": "2025-09-26T05:41:59.784Z",
  "url": "https://www.linkedin.com/jobs/view/..."
}
```

---

## ⚙️ **How to Modify for Different Requirements**

### **1. Change Time Filter (Currently 2 days)**
**File:** `src/scrapers/detailedLinkedInScraper.ts`
**Line:** Around line 51
```typescript
// Current (2 days)
const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encoded}&f_TPR=r172800`;

// Change to 1 day
const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encoded}&f_TPR=r86400`;

// Change to 1 week
const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encoded}&f_TPR=r604800`;
```

### **2. Add Cron Job Scheduling**
**Create new file:** `src/scheduler.ts`
```typescript
import cron from 'node-cron';
import { scrapeLinkedInDetailed } from './scrapers/detailedLinkedInScraper';

// Run every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('Running scheduled job scrape...');
  await scrapeLinkedInDetailed('software developer');
});

// Run every day at 9 AM
cron.schedule('0 9 * * *', async () => {
  console.log('Running daily job scrape...');
  await scrapeLinkedInDetailed('frontend developer');
});
```

### **3. Add Multiple Search Terms**
**File:** `src/index.ts`
```typescript
const searchTerms = [
  'software developer',
  'frontend developer',
  'backend developer',
  'data scientist'
];

for (const term of searchTerms) {
  const results = await scrapeLinkedInDetailed(term);
  console.log(`Scraped ${results.length} jobs for: ${term}`);
}
```

### **4. Add Location Filter**
**File:** `src/scrapers/detailedLinkedInScraper.ts`
```typescript
// Add location parameter
const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encoded}&f_TPR=r172800&location=San%20Francisco%20Bay%20Area`;
```

### **5. Change Output Format**
**File:** `src/scrapers/detailedLinkedInScraper.ts`
**Modify the job object structure around line 100-200**

---

## 🚀 **How to Run and Use**

### **Basic Usage:**
```bash
npm run dev "your search term"
```

### **Examples:**
```bash
npm run dev "frontend developer"
npm run dev "data scientist"
npm run dev "software engineer"
```

### **Output:**
- Console shows progress and results
- Data saved to `data/linkedin_jobs.json`
- Each run appends new jobs (no duplicates)

---

## 🔍 **Troubleshooting Common Issues**

### **1. No Jobs Found**
- **Cause:** LinkedIn changed selectors or blocked requests
- **Solution:** Update CSS selectors in `detailedLinkedInScraper.ts`

### **2. Rate Limiting**
- **Cause:** Too many requests too quickly
- **Solution:** Increase delays in `config.ts`

### **3. Browser Crashes**
- **Cause:** Memory issues or LinkedIn detection
- **Solution:** Reduce `SCRAPE_LIMIT` or add more delays

---

## 📈 **Performance Optimization**

### **Current Settings:**
- Scrapes 10 jobs per run
- 2-4 second delays between requests
- Headless browser mode

### **To Make Faster:**
- Reduce delays in `config.ts`
- Increase `SCRAPE_LIMIT`
- Use multiple browser instances

### **To Make More Reliable:**
- Increase delays
- Add more retry logic
- Use proxy rotation

---

## 🎯 **Key Points for Team Lead**

1. **What it does:** Automatically finds and extracts job details from LinkedIn
2. **Time filter:** Currently set to past 2 days (easily changeable)
3. **Output:** Structured JSON data ready for integration
4. **Scalability:** Can be modified for different time periods, locations, job types
5. **Reliability:** Built with error handling and anti-detection measures
6. **Maintenance:** Easy to update if LinkedIn changes their layout

This scraper is production-ready and can be easily modified for different requirements!
