// Drives the real pages in Chrome and writes what it saw to docs/evidence/<label>/.
//   BASE=http://localhost:4321 node scripts/check-browser.mjs local
//   BASE=https://<deployed> node scripts/check-browser.mjs live
// Checks: no console errors or page errors on any page, no sideways scroll at
// 375px, saved state survives a reload (ranks, hideout tick, run tick, loadout,
// bag), and export -> clear -> import gives back the same state.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const BASE = (process.env.BASE || "http://localhost:4321").replace(/\/$/, "");
const label = process.argv[2] || "local";
const OUT = path.join("docs", "evidence", label);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const PAGES = ["/", "/hideout", "/loadout", "/weight", "/loot", "/data"];
const chrome = process.env.CHROME || (process.platform === "win32" ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" : "/usr/bin/google-chrome");
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass, detail }); console.log((pass ? "PASS " : "FAIL ") + name + (detail ? " - " + detail : "")); };

async function open(ctx, url) {
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE + url, { waitUntil: "networkidle" });
  return { page, errors };
}

// ---- every page at desktop and phone width --------------------------------
for (const [w, h, tag] of [[1280, 720, "desktop"], [375, 812, "phone"]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  for (const url of PAGES) {
    const { page, errors } = await open(ctx, url);
    const name = (url === "/" ? "home" : url.slice(1)) + "-" + tag;
    ok(name + " no console errors", errors.length === 0, errors.join(" | "));
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(name + " no sideways scroll", over <= 0, "page is " + over + "px wider than the viewport");
    const filled = await page.evaluate(() => document.querySelector("main").innerText.length);
    ok(name + " rendered content", filled > 400, filled + " characters in main");
    await page.screenshot({ path: path.join(OUT, name + ".png") });
    await page.close();
  }
  await ctx.close();
}

// ---- saved state survives a reload, export/import round-trips -------------
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, acceptDownloads: true });
let { page } = await open(ctx, "/");
await page.selectOption('select[data-v="Turncoat"]', "2");
await page.selectOption('select[data-v="Handshake"]', "1");
await page.reload({ waitUntil: "networkidle" });
ok("ranks survive reload", (await page.inputValue('select[data-v="Turncoat"]')) === "2", "Turncoat select reads " + await page.inputValue('select[data-v="Turncoat"]'));

await page.goto(BASE + "/hideout", { waitUntil: "networkidle" });
const before = await page.textContent("#moves li");
await page.check('input[data-k="Two-Stroke Engine"]');
await page.check('input[data-run="tigerbay"]');
await page.reload({ waitUntil: "networkidle" });
ok("hideout tick survives reload", await page.isChecked('input[data-k="Two-Stroke Engine"]'));
ok("run tick survives reload", await page.isChecked('input[data-run="tigerbay"]'));
const after = await page.textContent("#moves li");
ok("built tick moves Next build on", before !== after, before.slice(0, 30) + " -> " + after.slice(0, 40));

await page.goto(BASE + "/loadout", { waitUntil: "networkidle" });
await page.selectOption("#sel-weapon", "ak-12");
await page.waitForSelector("#sel-ammo option[value='5-45x39mm-bp-7n22']", { state: "attached" });
await page.selectOption("#sel-ammo", "5-45x39mm-bp-7n22");
await page.fill('input[data-n="1"]', "120");
await page.press('input[data-n="1"]', "Tab");
await page.selectOption("#sel-vest", { index: 3 });
await page.fill('input[data-price="ak-12"]', "12345");
await page.press('input[data-price="ak-12"]', "Tab");
await page.fill("#lname", "Check loadout");
await page.click("#saveBtn");
const lockText = await page.textContent("#tot");
await page.screenshot({ path: path.join(OUT, "loadout-filled-phone.png"), fullPage: false });
await page.reload({ waitUntil: "networkidle" });
const saved = await page.textContent("#savedList");
ok("named loadout survives reload", saved.includes("Check loadout"), saved.slice(0, 80));
ok("loadout draft survives reload", (await page.inputValue("#sel-weapon")) === "ak-12");
ok("typed price survives reload", (await page.inputValue('input[data-price="ak-12"]')) === "12345");
ok("loadout totals rendered", /kg/.test(lockText), lockText.replace(/\s+/g, " ").slice(0, 120));

await page.goto(BASE + "/weight?run=tigerbay", { waitUntil: "networkidle" });
await page.reload({ waitUntil: "networkidle" });
const bag = await page.textContent("#bagRows");
ok("run bag lands in the weight tool and survives reload", bag.includes("Steel") && bag.includes("Motor Oil"), bag.replace(/\s+/g, " ").slice(0, 100));
const big = await page.textContent("#big");
ok("weight total includes loadout and bag", /Total/.test(big), big.replace(/\s+/g, " "));
await page.screenshot({ path: path.join(OUT, "weight-tigerbay-phone.png"), fullPage: false });

await page.goto(BASE + "/data", { waitUntil: "networkidle" });
const stateBefore = await page.evaluate(() => localStorage.getItem("gzwkit.v1"));
const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#exp")]);
const file = path.join(OUT, "export.json");
await dl.saveAs(file);
page.once("dialog", (d) => d.accept());
await page.click("#clr");
const cleared = await page.evaluate(() => localStorage.getItem("gzwkit.v1"));
ok("clear empties storage", cleared === null, String(cleared));
await page.setInputFiles("#file", file);
await page.waitForFunction(() => /Imported/.test(document.getElementById("msg").textContent));
const stateAfter = await page.evaluate(() => localStorage.getItem("gzwkit.v1"));
ok("export -> clear -> import gives the same state", stateBefore === stateAfter && stateBefore && stateBefore.length > 50, (stateBefore || "").length + " chars before, " + (stateAfter || "").length + " after");
await page.reload({ waitUntil: "networkidle" });
const sumText = await page.textContent("#summary");
ok("imported state survives reload", /1 saved loadouts/.test(sumText), sumText);
await page.screenshot({ path: path.join(OUT, "data-after-import-phone.png") });
fs.writeFileSync(path.join(OUT, "bad.json"), '{"app":"something-else","data":{}}');
await page.setInputFiles("#file", path.join(OUT, "bad.json"));
await page.waitForFunction(() => /Not imported/.test(document.getElementById("msg").textContent));
ok("a foreign file is refused", true, await page.textContent("#msg"));
fs.rmSync(path.join(OUT, "bad.json"));
await browser.close();

const failed = results.filter((r) => !r.pass);
const MIN = 40;
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify({ base: BASE, at: new Date().toISOString(), checks: results.length, failed: failed.length, results }, null, 1));
console.log(results.length + " checks, " + failed.length + " failed (need at least " + MIN + " checks)");
process.exit(failed.length || results.length < MIN ? 1 : 0);
