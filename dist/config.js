"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
exports.CONFIG = {
    PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH || "",
    HTTP_PROXY: process.env.HTTP_PROXY || "",
    SCRAPE_LIMIT: Number(process.env.SCRAPE_LIMIT || 5), // Increased limit for recent jobs
    DELAY_MIN_MS: Number(process.env.DELAY_MIN_MS || 2000), // Increased minimum delay
    DELAY_MAX_MS: Number(process.env.DELAY_MAX_MS || 4000), // Increased maximum delay
    OUTPUT_PATH: process.env.OUTPUT_PATH || path_1.default.join(__dirname, "../data/linkedin_jobs.json"),
};
//# sourceMappingURL=config.js.map