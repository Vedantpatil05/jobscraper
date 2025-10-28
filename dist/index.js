"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const detailedLinkedInScraper_1 = require("./scrapers/detailedLinkedInScraper");
const config_1 = require("./config");
const indeedScraper_1 = require("./scrapers/indeedScraper");
const naukriScraper_1 = require("./scrapers/naukriScraper");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function main() {
    try {
        const argv = process.argv.slice(2);
        // Parse flags: --location/-l, --geo-id/-g, --only, --write-merged
        let locationFlag;
        let geoIdFlag;
        let onlyFlag;
        let writeMergedFlag = false;
        const remainingArgs = [];
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
        let location = locationFlag;
        let geoId = geoIdFlag;
        if (remainingArgs.length === 0) {
            // keep defaults
        }
        else if (remainingArgs.length === 1 && !location) {
            // Support syntax: "python developer in mumbai"; otherwise treat as full query only
            const single = remainingArgs[0].trim();
            const inSplit = single.split(/\s+in\s+/i);
            if (inSplit.length === 2) {
                query = inSplit[0].trim();
                location = inSplit[1].trim();
            }
            else {
                query = single;
            }
        }
        else {
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
        const baseDir = path_1.default.dirname(path_1.default.resolve(config_1.CONFIG.OUTPUT_PATH));
        if (!fs_1.default.existsSync(baseDir))
            fs_1.default.mkdirSync(baseDir, { recursive: true });
        const normalizeJobs = (rows) => {
            return (rows || []).map((r) => {
                const job = {
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
                    responsibilities: Array.isArray(r.responsibilities) ? r.responsibilities.slice(0, 10).map((x) => String(x).trim()) : undefined,
                    requirements: Array.isArray(r.requirements) ? r.requirements.slice(0, 10).map((x) => String(x).trim()) : undefined,
                    seniorityLevel: r.seniorityLevel ? String(r.seniorityLevel).trim() : undefined,
                    howRecent: r.howRecent ? String(r.howRecent).trim() : undefined,
                    scrapedAt: r.scrapedAt ? String(r.scrapedAt) : new Date().toISOString(),
                    url: r.url ? String(r.url).trim() : undefined,
                };
                return job;
            });
        };
        const writeFileOverwrite = (filename, rows) => {
            const target = path_1.default.join(baseDir, filename);
            const normalized = normalizeJobs(rows);
            fs_1.default.writeFileSync(target, JSON.stringify(normalized, null, 2), "utf-8");
            console.log(`Wrote ${normalized.length} jobs to ${target}`);
        };
        const liPromise = runLinkedIn ? (0, detailedLinkedInScraper_1.scrapeLinkedInDetailed)(query, location, geoId, { writeToFile: false }) : Promise.resolve([]);
        const indeedPromise = runIndeed ? (0, indeedScraper_1.scrapeIndeed)(query, location) : Promise.resolve([]);
        const naukriPromise = runNaukri ? (0, naukriScraper_1.scrapeNaukri)(query, location) : Promise.resolve([]);
        const [li, indeed, naukri] = await Promise.all([liPromise, indeedPromise, naukriPromise]);
        if (runLinkedIn)
            writeFileOverwrite("linkedin_jobs_only.json", li);
        if (runIndeed)
            writeFileOverwrite("indeed_jobs.json", indeed);
        if (runNaukri)
            writeFileOverwrite("naukri_jobs.json", naukri);
        const combined = [...li, ...indeed, ...naukri];
        console.log("Scraped totals ->", runLinkedIn ? `LinkedIn: ${li.length}` : "", runIndeed ? `Indeed: ${indeed.length}` : "", runNaukri ? `Naukri: ${naukri.length}` : "", "Combined:", combined.length);
        // Write combined results to the configured output file
        if (writeMergedFlag) {
            const outputPath = path_1.default.resolve(config_1.CONFIG.OUTPUT_PATH);
            let existing = [];
            try {
                if (fs_1.default.existsSync(outputPath)) {
                    const raw = fs_1.default.readFileSync(outputPath, "utf-8");
                    existing = JSON.parse(raw) || [];
                }
            }
            catch {
                existing = [];
            }
            const merged = normalizeJobs(existing.concat(combined));
            const dir = path_1.default.dirname(outputPath);
            if (!fs_1.default.existsSync(dir))
                fs_1.default.mkdirSync(dir, { recursive: true });
            fs_1.default.writeFileSync(outputPath, JSON.stringify(merged, null, 2), "utf-8");
            console.log(`Saved ${combined.length} new jobs to ${outputPath}`);
        }
        console.log("Done.");
        process.exit(0);
    }
    catch (err) {
        console.error("Fatal error:", err);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map