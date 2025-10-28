"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomDelay = randomDelay;
exports.pickUserAgent = pickUserAgent;
exports.retry = retry;
const user_agents_1 = __importDefault(require("user-agents"));
/**
 * randomDelay: wait random ms between min..max
 */
function randomDelay(min = 500, max = 1500) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((res) => setTimeout(res, ms));
}
/**
 * pickUserAgent: returns a realistic user-agent string
 */
function pickUserAgent() {
    const ua = new user_agents_1.default();
    return ua.toString();
}
/**
 * retry helper with async fn
 */
async function retry(fn, maxAttempts = 3, delayMs = 1000) {
    let attempt = 0;
    let lastError;
    while (attempt < maxAttempts) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err;
            attempt++;
            if (attempt < maxAttempts) {
                await new Promise((r) => setTimeout(r, delayMs * attempt));
            }
        }
    }
    throw lastError;
}
//# sourceMappingURL=helpers.js.map