import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const CONFIG = {
  PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH || "",
  HTTP_PROXY: process.env.HTTP_PROXY || "",
  SCRAPE_LIMIT: Number(process.env.SCRAPE_LIMIT || 5), // Number of jobs to fetch per scraper
  TIME_FILTER_DAYS: Number(process.env.TIME_FILTER_DAYS || 2), // Number of days back to search for jobs
  DELAY_MIN_MS: Number(process.env.DELAY_MIN_MS || 2000), // Increased minimum delay
  DELAY_MAX_MS: Number(process.env.DELAY_MAX_MS || 4000), // Increased maximum delay
  OUTPUT_PATH: process.env.OUTPUT_PATH || path.join(process.cwd(), "data/combined_jobs.json"),
};
