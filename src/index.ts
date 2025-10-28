import { scrapeLinkedInDetailed } from "./scrapers/detailedLinkedInScraper";
import { CONFIG } from "./config";
import { scrapeIndeed } from "./scrapers/indeedScraper";
import { scrapeNaukri } from "./scrapers/naukriScraper";
import fs from "fs";
import path from "path";

async function main() {
  try {
    console.log('🚀 Starting job scraper...');
    const argv = process.argv.slice(2);

    // Parse flags: --location/-l, --geo-id/-g, --only, --write-merged
    let locationFlag: string | undefined;
    let geoIdFlag: string | undefined;
    let onlyFlag: string | undefined;
    let writeMergedFlag: boolean = false;
    const remainingArgs: string[] = [];
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i];
      if (arg === "--location" || arg === "-l") {
        locationFlag = argv[i + 1];
        i++;
        continue;
      }
      const match = arg.match(/^--location=(.*)$/);
      if (match) {
        locationFlag = match[1];
        continue;
      }
      if (arg === "--geo-id" || arg === "-g") {
        geoIdFlag = argv[i + 1];
        i++;
        continue;
      }
      const geoMatch = arg.match(/^--geo-id=(.*)$/);
      if (geoMatch) {
        geoIdFlag = geoMatch[1];
        continue;
      }
      if (arg === "--only") {
        onlyFlag = (argv[i + 1] || "").toLowerCase();
        i++;
        continue;
      }
      const onlyMatch = arg.match(/^--only=(.*)$/);
      if (onlyMatch) {
        onlyFlag = (onlyMatch[1] || "").toLowerCase();
        continue;
      }
      if (arg === "--write-merged" || arg === "--merged") {
        writeMergedFlag = true;
        continue;
      }
      remainingArgs.push(arg);
    }

    // Determine query and location
    let query = "software developer";
    let location: string | undefined = locationFlag;
    let geoId: string | undefined = geoIdFlag;

    if (remainingArgs.length === 0) {
      // keep defaults
    } else if (remainingArgs.length === 1 && !location) {
      // Support syntax: "python developer in mumbai"; otherwise treat as full query only
      const single = remainingArgs[0].trim();
      const inSplit = single.split(/\s+in\s+/i);
      if (inSplit.length === 2) {
        query = inSplit[0].trim();
        location = inSplit[1].trim();
      } else {
        query = single;
      }
    } else {
      // If multiple non-flag args are provided, treat first as query, remaining as location
      query = remainingArgs[0];
      if (!location && remainingArgs.length >= 2) {
        location = remainingArgs.slice(1).join(" ");
      }
    }

    const runLinkedIn = !onlyFlag || onlyFlag.includes("linkedin") || onlyFlag === "li";
    const runIndeed = !onlyFlag || onlyFlag.includes("indeed");
    const runNaukri = !onlyFlag || onlyFlag.includes("naukri");

    console.log("Running scrapers:", [runLinkedIn ? "LinkedIn" : undefined, runIndeed ? "Indeed" : undefined, runNaukri ? "Naukri" : undefined].filter(Boolean).join(", "));

    // Run in parallel and write per-source files
    const baseDir = path.dirname(path.resolve(CONFIG.OUTPUT_PATH));
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

    const normalizeJobs = (rows: any[]) => {
      return (rows || []).map((r: any) => {
        const job: any = {
          jobId: r.jobId ?? undefined,
          source: String(r.source || "Unknown"),
          title: r.title ? String(r.title).trim() : undefined,
          company: r.company ? String(r.company).trim() : undefined,
          companyLogo: r.companyLogo ? String(r.companyLogo).trim() : undefined,
          location: r.location ? String(r.location).trim() : undefined,
          timezone: r.timezone ? String(r.timezone).trim() : undefined,
          employmentType: r.employmentType ? String(r.employmentType).trim() : undefined,
          postedDate: r.postedDate ? String(r.postedDate).trim() : undefined,
          applyLink: r.applyLink ? String(r.applyLink).trim() : undefined,
          aboutCompany: r.aboutCompany ? String(r.aboutCompany).trim() : undefined,
          roleOverview: r.roleOverview ? String(r.roleOverview).trim() : undefined,
          responsibilities: Array.isArray(r.responsibilities) ? r.responsibilities.slice(0, 10).map((x: any) => String(x).trim()) : undefined,
          requirements: Array.isArray(r.requirements) ? r.requirements.slice(0, 10).map((x: any) => String(x).trim()) : undefined,
          seniorityLevel: r.seniorityLevel ? String(r.seniorityLevel).trim() : undefined,
          howRecent: r.howRecent ? String(r.howRecent).trim() : undefined,
          scrapedAt: r.scrapedAt ? String(r.scrapedAt) : new Date().toISOString(),
          url: r.url ? String(r.url).trim() : undefined,
        };
        return job;
      });
    };

    const writeFileOverwrite = (filename: string, rows: any[]) => {
      try {
        const target = path.join(baseDir, filename);
        const normalized = normalizeJobs(rows);
        
        // Ensure directory exists
        const dir = path.dirname(target);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`Created directory: ${dir}`);
        }
        
        fs.writeFileSync(target, JSON.stringify(normalized, null, 2), "utf-8");
        console.log(`✓ Wrote ${normalized.length} jobs to ${filename}`);
      } catch (error) {
        console.error(`✗ Failed to write ${filename}:`, error instanceof Error ? error.message : error);
      }
    };

    console.log(`\n🔍 Searching for: "${query}"${location ? ` in "${location}"` : ''}`);
    console.log(`📊 Limit: ${CONFIG.SCRAPE_LIMIT} jobs per scraper\n`);

    const liPromise = runLinkedIn ? scrapeLinkedInDetailed(query, location, geoId, { writeToFile: false }).catch(error => {
      console.error('✗ LinkedIn scraper failed:', error instanceof Error ? error.message : error);
      return [];
    }) : Promise.resolve([] as any[]);
    
    const indeedPromise = runIndeed ? scrapeIndeed(query, location).catch(error => {
      console.error('✗ Indeed scraper failed:', error instanceof Error ? error.message : error);
      return [];
    }) : Promise.resolve([] as any[]);
    
    const naukriPromise = runNaukri ? scrapeNaukri(query, location).catch(error => {
      console.error('✗ Naukri scraper failed:', error instanceof Error ? error.message : error);
      return [];
    }) : Promise.resolve([] as any[]);

    const [li, indeed, naukri] = await Promise.all([liPromise, indeedPromise, naukriPromise]);

    if (runLinkedIn) writeFileOverwrite("linkedin_jobs.json", li as any[]);
    if (runIndeed) writeFileOverwrite("indeed_jobs.json", indeed as any[]);
    if (runNaukri) writeFileOverwrite("naukri_jobs.json", naukri as any[]);

    const combined = [...li, ...indeed, ...naukri];
    
    console.log('\n📈 Results Summary:');
    if (runLinkedIn) console.log(`  • LinkedIn: ${li.length} jobs`);
    if (runIndeed) console.log(`  • Indeed: ${indeed.length} jobs`);
    if (runNaukri) console.log(`  • Naukri: ${naukri.length} jobs`);
    console.log(`  • Total: ${combined.length} jobs`);
    
    if (combined.length === 0) {
      console.log('\n⚠️  No jobs found. Try different keywords or location.');
    } else {
      console.log('\n✅ Scraping completed successfully!');
      console.log(`📁 Files saved in: ${baseDir}`);
    }

    // Write combined results to the configured output file
    if (writeMergedFlag) {
      const outputPath = path.resolve(CONFIG.OUTPUT_PATH);
      let existing: any[] = [];
      try {
        if (fs.existsSync(outputPath)) {
          const raw = fs.readFileSync(outputPath, "utf-8");
          existing = JSON.parse(raw) || [];
        }
      } catch {
        existing = [];
      }
      const merged = normalizeJobs(existing.concat(combined));
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2), "utf-8");
      console.log(`Saved ${combined.length} new jobs to ${outputPath}`);
    }

    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error('\n💥 Fatal error occurred:');
    console.error(err instanceof Error ? err.message : err);
    console.error('\nPlease check your internet connection and try again.');
    process.exit(1);
  }
}

main();

