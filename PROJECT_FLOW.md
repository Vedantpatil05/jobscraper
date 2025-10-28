# LinkedIn Job Scraper - Project Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        PROJECT FLOW                             │
└─────────────────────────────────────────────────────────────────┘

1. START
   │
   ▼
┌─────────────────┐
│   index.ts      │ ◄─── Entry Point
│                 │      • Gets search query from command line
│                 │      • Calls main scraping function
│                 │      • Shows results to user
└─────────────────┘
   │
   ▼
┌─────────────────┐
│   config.ts     │ ◄─── Configuration
│                 │      • Scraping limits
│                 │      • Delay settings
│                 │      • Output file path
└─────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│           detailedLinkedInScraper.ts                            │ ◄─── Core Logic
│                                                                 │
│  Step 1: Browser Setup                                          │
│  ├── Launch Puppeteer with stealth settings                    │
│  ├── Anti-detection measures                                    │
│  └── Realistic user agent                                       │
│                                                                 │
│  Step 2: Search URL Construction                                │
│  ├── Encode search query                                        │
│  ├── Add date filter (f_TPR=r172800 = past 2 days)             │
│  └── Navigate to LinkedIn search page                           │
│                                                                 │
│  Step 3: Extract Job URLs                                       │
│  ├── Find all job links on search page                          │
│  ├── Filter for actual job postings                             │
│  └── Limit to first 10 jobs                                     │
│                                                                 │
│  Step 4: Individual Job Scraping                               │
│  ├── For each job URL:                                         │
│  │   ├── Open new browser page                                 │
│  │   ├── Navigate to job page                                  │
│  │   ├── Extract detailed information                           │
│  │   │   ├── Job title, company, location                      │
│  │   │   ├── Posted date, employment type                      │
│  │   │   ├── Apply link, company logo                          │
│  │   │   ├── Role overview, responsibilities                   │
│  │   │   ├── Requirements, seniority level                     │
│  │   │   └── Company information                               │
│  │   ├── Close page                                            │
│  │   └── Add delay between requests                             │
│  └── Continue to next job                                       │
│                                                                 │
│  Step 5: Save Results                                           │
│  ├── Merge with existing data                                   │
│  ├── Remove duplicates                                          │
│  └── Save to JSON file                                          │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────┐
│ browser.ts       │ ◄─── Browser Configuration
│                 │      • Launch arguments
│                 │      • Anti-detection settings
│                 │      • User agent strings
└─────────────────┘
   │
   ▼
┌─────────────────┐
│ helpers.ts      │ ◄─── Utility Functions
│                 │      • Random delays
│                 │      • User agent generation
│                 │      • Retry logic
└─────────────────┘
   │
   ▼
┌─────────────────┐
│ linkedin_jobs   │ ◄─── Output File
│ .json           │      • Structured job data
│                 │      • Ready for integration
└─────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    KEY CONFIGURATION POINTS                    │
└─────────────────────────────────────────────────────────────────┘

1. TIME FILTER MODIFICATION:
   File: detailedLinkedInScraper.ts (line ~51)
   Current: f_TPR=r172800 (2 days)
   Options: r86400 (1 day), r604800 (1 week), r2592000 (1 month)

2. SCRAPING LIMIT:
   File: config.ts
   Current: 20 jobs max
   Modify: SCRAPE_LIMIT value

3. DELAY SETTINGS:
   File: config.ts
   Current: 2-4 seconds between requests
   Modify: DELAY_MIN_MS and DELAY_MAX_MS

4. SEARCH TERMS:
   File: index.ts
   Current: Command line argument
   Modify: Add multiple terms or hardcode

5. OUTPUT FORMAT:
   File: detailedLinkedInScraper.ts
   Current: Detailed job object
   Modify: Add/remove fields as needed

┌─────────────────────────────────────────────────────────────────┐
│                      COMMON MODIFICATIONS                      │
└─────────────────────────────────────────────────────────────────┘

• Change time period: Modify f_TPR parameter
• Add location filter: Add &location=City%20Name
• Multiple search terms: Loop through array of terms
• Cron job: Add node-cron scheduling
• Different output: Modify job object structure
• Proxy support: Add proxy settings to browser config
