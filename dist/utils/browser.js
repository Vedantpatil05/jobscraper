"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchBrowser = launchBrowser;
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const config_1 = require("../config");
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
async function launchBrowser() {
    const launchArgs = [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-background-networking",
        "--disable-sync",
        "--hide-scrollbars",
        "--mute-audio",
        "--disable-blink-features=AutomationControlled",
        "--disable-features=VizDisplayCompositor",
        "--disable-web-security",
        "--disable-features=site-per-process",
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ];
    // Add proxy if provided
    if (config_1.CONFIG.HTTP_PROXY) {
        launchArgs.push(`--proxy-server=${config_1.CONFIG.HTTP_PROXY}`);
    }
    const options = {
        headless: false, // Run in visible mode to debug
        args: launchArgs,
        defaultViewport: { width: 1366, height: 768 },
        timeout: 60000,
        ignoreDefaultArgs: ["--enable-automation"],
    };
    if (config_1.CONFIG.PUPPETEER_EXECUTABLE_PATH) {
        options.executablePath = config_1.CONFIG.PUPPETEER_EXECUTABLE_PATH;
    }
    const browser = await puppeteer_extra_1.default.launch(options);
    return browser;
}
//# sourceMappingURL=browser.js.map