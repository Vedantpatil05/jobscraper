import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { CONFIG } from "../config";

puppeteer.use(StealthPlugin());

export async function launchBrowser() {
  const launchArgs: string[] = [
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
  if (CONFIG.HTTP_PROXY) {
    launchArgs.push(`--proxy-server=${CONFIG.HTTP_PROXY}`);
  }

  const options: any = {
    headless: false, // Run in visible mode to debug
    args: launchArgs,
    defaultViewport: { width: 1366, height: 768 },
    timeout: 60000,
    ignoreDefaultArgs: ["--enable-automation"],
  };

  if (CONFIG.PUPPETEER_EXECUTABLE_PATH) {
    options.executablePath = CONFIG.PUPPETEER_EXECUTABLE_PATH;
  }

  const browser = await puppeteer.launch(options);
  return browser;
}
