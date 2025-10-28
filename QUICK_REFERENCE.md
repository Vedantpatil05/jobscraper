# Quick Reference Guide - LinkedIn Job Scraper

## 🚀 **Quick Commands**

```bash
# Run scraper with custom search term
npm run dev "frontend developer"

# Run with different terms
npm run dev "data scientist"
npm run dev "software engineer"
npm run dev "product manager"

# Run with location as second argument
npm run dev "python developer" "mumbai"

# Run with inline "in <city>" syntax
npm run dev "python developer in mumbai"

# Run with --location flag
npm run dev "python developer" --location "mumbai"
npm run dev "python developer" -l "new delhi"

# Run combined scrapers (LinkedIn + Indeed + Naukri)
npm run dev "software engineer" --location "India"
```

## ⚙️ **Common Modifications**

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

// Change to 1 month
const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encoded}&f_TPR=r2592000`;

// Remove time filter (all jobs)
const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encoded}`;
```

### **2. Add Location Filter**

**File:** `src/scrapers/detailedLinkedInScraper.ts`
**Line:** Around line 51

```typescript
// Add location to search
const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encoded}&f_TPR=r172800&location=San%20Francisco%20Bay%20Area`;

// Multiple locations
const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encoded}&f_TPR=r172800&location=New%20York%2C%20NY`;
```

### **3. Change Number of Jobs Scraped**

**File:** `src/config.ts`
**Line:** Around line 9

```typescript
// Current
SCRAPE_LIMIT: Number(process.env.SCRAPE_LIMIT || 20),

// Change to 50 jobs
SCRAPE_LIMIT: Number(process.env.SCRAPE_LIMIT || 50),

// Change to 5 jobs (for testing)
SCRAPE_LIMIT: Number(process.env.SCRAPE_LIMIT || 5),
```

### **4. Add Multiple Search Terms**

**File:** `src/index.ts`
**Replace the main function:**

```typescript
async function main() {
  try {
    const searchTerms = [
      'software developer',
      'frontend developer', 
      'backend developer',
      'data scientist',
      'product manager'
    ];

    for (const term of searchTerms) {
      console.log(`\nScraping jobs for: ${term}`);
      const results = await scrapeLinkedInDetailed(term);
      console.log(`Found ${results.length} jobs for ${term}`);
    }
    
    console.log("All scraping completed!");
    process.exit(0);
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
}
```

### **5. Add Cron Job Scheduling**

**Install dependency:**
```bash
npm install node-cron
npm install @types/node-cron --save-dev
```

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

// Run every Monday at 8 AM
cron.schedule('0 8 * * 1', async () => {
  console.log('Running weekly job scrape...');
  await scrapeLinkedInDetailed('data scientist');
});

console.log('Cron jobs scheduled!');
```

**Update package.json:**
```json
{
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc -p .",
    "start": "node dist/index.js",
    "scheduler": "ts-node src/scheduler.ts"
  }
}
```

**Run scheduler:**
```bash
npm run scheduler
```

### **6. Change Output File Location**

**File:** `src/config.ts`
**Line:** Around line 12

```typescript
// Current
OUTPUT_PATH: process.env.OUTPUT_PATH || path.join(__dirname, "../data/linkedin_jobs.json"),

// Change to different location
OUTPUT_PATH: process.env.OUTPUT_PATH || path.join(__dirname, "../output/jobs.json"),

// Change to absolute path
OUTPUT_PATH: process.env.OUTPUT_PATH || "C:/Users/username/Documents/jobs.json",
```

### **7. Add New Data Fields**

**File:** `src/scrapers/detailedLinkedInScraper.ts`
**Add to DetailedJob interface (around line 9):**

```typescript
export interface DetailedJob {
  // ... existing fields ...
  salary?: string;           // Add salary field
  benefits?: string[];       // Add benefits field
  workMode?: string;         // Add work mode field
  experienceLevel?: string;  // Add experience level field
}
```

**Add extraction logic in jobDetails object (around line 200):**

```typescript
// Extract salary
const salarySelectors = ['.salary', '.compensation', '.pay'];
for (const selector of salarySelectors) {
  const element = document.querySelector(selector);
  if (element && element.textContent) {
    job.salary = element.textContent.trim();
    break;
  }
}

// Extract benefits
const benefitsText = description.toLowerCase();
if (benefitsText.includes('benefits:')) {
  // Parse benefits from description
  job.benefits = ['Health Insurance', '401k', 'Remote Work']; // Example
}
```

### **8. Change Delay Settings**

**File:** `src/config.ts`
**Lines:** Around lines 10-11

```typescript
// Current (2-4 seconds)
DELAY_MIN_MS: Number(process.env.DELAY_MIN_MS || 2000),
DELAY_MAX_MS: Number(process.env.DELAY_MAX_MS || 4000),

// Faster (1-2 seconds)
DELAY_MIN_MS: Number(process.env.DELAY_MIN_MS || 1000),
DELAY_MAX_MS: Number(process.env.DELAY_MAX_MS || 2000),

// Slower (5-10 seconds) - more reliable
DELAY_MIN_MS: Number(process.env.DELAY_MIN_MS || 5000),
DELAY_MAX_MS: Number(process.env.DELAY_MAX_MS || 10000),
```

### **9. Add Proxy Support**

**File:** `src/scrapers/detailedLinkedInScraper.ts`
**Add to browser launch options (around line 25):**

```typescript
const browser = await puppeteer.launch({
  headless: "new",
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=VizDisplayCompositor',
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    '--proxy-server=http://your-proxy:port'  // Add this line
  ],
  ignoreDefaultArgs: ['--enable-automation'],
  defaultViewport: { width: 1366, height: 768 }
});
```

### **10. Debug Mode (Show Browser)**

**File:** `src/scrapers/detailedLinkedInScraper.ts`
**Line:** Around line 25

```typescript
// Current (headless)
headless: "new",

// Debug mode (show browser)
headless: false,
```

## 🔧 **Environment Variables**

Create `.env` file in project root:

```env
# Scraping settings
SCRAPE_LIMIT=20
DELAY_MIN_MS=2000
DELAY_MAX_MS=4000

# Output settings
OUTPUT_PATH=./data/linkedin_jobs.json

# Browser settings
PUPPETEER_EXECUTABLE_PATH=
HTTP_PROXY=
```

## 📊 **Output Data Structure**

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

## 🚨 **Troubleshooting**

### **No Jobs Found**
- Check if LinkedIn changed their layout
- Update CSS selectors in `detailedLinkedInScraper.ts`
- Try different search terms

### **Rate Limited**
- Increase delays in `config.ts`
- Reduce `SCRAPE_LIMIT`
- Add more delays between requests

### **Browser Crashes**
- Reduce `SCRAPE_LIMIT` to 5-10 jobs
- Increase delays
- Check system memory

### **Permission Errors**
- Check file permissions for output directory
- Run with appropriate user permissions
- Check antivirus software blocking

## 📝 **Notes for Team Lead**

1. **Current Setup:** Scrapes jobs posted in past 2 days
2. **Output:** Structured JSON data ready for integration
3. **Scalability:** Easy to modify for different requirements
4. **Reliability:** Built with error handling and anti-detection
5. **Maintenance:** Simple to update if LinkedIn changes layout
6. **Performance:** Configurable delays and limits for optimal performance
