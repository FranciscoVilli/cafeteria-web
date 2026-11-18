import { chromium } from "playwright-core"; import { pathToFileURL } from "node:url";
const [html, png] = process.argv.slice(2);
const nav = await chromium.launch({ channel: "chrome" });
const p = await nav.newPage({ deviceScaleFactor: 2, viewport: { width: 1200, height: 900 } });
await p.goto(pathToFileURL(html).href);
await p.locator("#d").screenshot({ path: png }); await nav.close(); console.log("ok", png);
