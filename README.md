# Job Scraper

A TypeScript-based job scraper for LinkedIn, Indeed, and Naukri using Puppeteer.

## Requirements
- Node.js >= 18
- npm >= 9

## Setup
`ash
# Install dependencies
npm ci

# Build TypeScript
npm run build

# Run scraper (choose a target inside src/index.ts config)
npm start
`

## Development
`ash
# Run with ts-node
npm run dev
`

## Output
- Scraped data is saved under data/ as JSON files.

## Notes
- Headless browser behavior is configured in src/utils/browser.ts.
- Scraper configs and toggles live in src/config.ts.
