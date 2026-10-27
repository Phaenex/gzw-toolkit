// Builds public/data/*.json and public/img/ from the games-center repo.
//
//   node scripts/sync.mjs              read games-center's shipped data as it is
//   node scripts/sync.mjs --rescrape   run games-center's scrapers and hideout
//                                      builder first, then read the fresh output
//
// games-center is found at GC_DIR, or ../games-center next to this repo.
// Nothing here is typed in by hand from those files: every value is read from
// them and then trimmed. What is removed is anything about one particular
// player (ranks, locker, kit prices off a screenshot, personal reports) and
// the links into games-center's own map, which this site does not have.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GC = path.resolve(process.env.GC_DIR || path.join(ROOT, "..", "games-center"));
const OUT = path.join(ROOT, "public", "data");
const IMG = path.join(ROOT, "public", "img");
const TACMAP = "https://gzwtacmap.com/maps/lamang";
const HEALTH = "https://gray-zone-warfare.fandom.com/wiki/Health_system";

if (!fs.existsSync(path.join(GC, "public", "data", "gzw-items.json"))) {
  console.error("games-center not found at " + GC + ". Set GC_DIR.");
  process.exit(1);
}

if (process.argv.includes("--rescrape")) {
  const run = (cmd, args) => { console.log("> " + cmd + " " + args.join(" ")); execFileSync(cmd, args, { cwd: GC, stdio: "inherit" }); };
  run("node", ["scripts/scrape/fetch-gzw-items.mjs"]);
  run("node", ["scripts/scrape/fetch-gzw-loot.mjs"]);
  run("node", ["scripts/scrape/fetch-tacmap.mjs"]);
  run("python", ["scripts/build-gzw-hideout.py"]);
}

const read = (f) => JSON.parse(fs.readFileSync(path.join(GC, "public", "data", f), "utf8"));
const write = (f, o) => { fs.writeFileSync(path.join(OUT, f), JSON.stringify(o)); console.log("wrote", f, fs.statSync(path.join(OUT, f)).size, "bytes"); };
const pick = (o, keys) => { const r = {}; for (const k of keys) if (o[k] !== undefined && o[k] !== null) r[k] = o[k]; return r; };

// ---- images: copied from games-center's resolved wiki renders, never made --
// games-center resolved each picture through the item's own wiki page. Only
// items that have one get a file; the pages show a labelled gap for the rest.
function copyImg(kind, gcRel, id) {
  if (!gcRel) return null;
  const src = path.join(GC, "public", gcRel.replace(/^\//, ""));
  if (!fs.existsSync(src)) return null;
  const dir = path.join(IMG, kind);
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(src);
  fs.copyFileSync(src, path.join(dir, id + ext));
  return "/img/" + kind + "/" + id + ext;
}
fs.rmSync(IMG, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// ---- items: the gear a loadout is built from ------------------------------
const I = read("gzw-items.json");
const GEAR = new Set(["weapon", "vest", "helmet", "rig", "backpack", "ammo"]);
const KEEP = ["id", "name", "group", "type", "wiki", "sold", "loot", "unlock", "weight", "size", "slots",
  "prot", "material", "cover", "kind", "caliber", "calName", "cal", "cls", "moa", "rpm", "rounds", "punch",
  "short", "velocity", "reach", "tier", "flags", "missing"];
const items = I.items.filter((i) => GEAR.has(i.group)).map((i) => {
  const o = pick(i, KEEP);
  o.img = copyImg("items", i.img, i.id);
  if (o.img) o.imgSource = i.imgSource;
  return o;
});
const CLS = I.classes;
const ci = (c) => CLS.indexOf(c);

// ---- loot: sell values ----------------------------------------------------
const L = read("gzw-loot.json");
const loot = L.items.map((i) => {
  const o = pick(i, ["id", "name", "category", "alsoIn", "buyer", "taskOnly", "price", "weight", "size", "slots", "perSlot", "perKg", "found", "page"]);
  o.img = copyImg("loot", i.img, i.id);
  return o;
});

// ---- hideout: the guide, made player-neutral ------------------------------
const H = read("gzw-hideout.json");
const tac = (o) => { if (o && typeof o.map === "string" && o.map.startsWith("/gzw/map")) o.map = TACMAP; return o; };
H.runs.forEach((r) => { tac(r); r.stops.forEach(tac); });
H.sites.forEach(tac);
H.hack.parts.forEach(tac);
H.safes.forEach(tac);
H.sites.forEach((s) => { if (s.layoutSrc) s.layoutSrc = "the in-game map, 25 Oct 2026"; });
H.unv = H.unv.map((u) => u.c === "Exact unlock ranks"
  ? { c: u.c, r: "The community wiki says Lab Rat R2 and Artisan R2; another guide lists Lab Rat R2 only. This page uses the stricter rule." }
  : u);
H.source = "0.5 Rogue Ops hideout. Level 1 build costs come from two community guides (grayzonewarfaregame.wiki hideout guide, GamesHorizon); four Workshop stations were also checked on the in-game build screen on 23 Oct 2026 (game 0.5.0.1) and are marked seen. Room purposes and the stim and tag change come from the official 0.5 devlogs. Codes, 0.5 sites and safes: AllThings.How, TPose Gaming, the Fandom wiki item pages, and pins from the live GZW Tac Map (fetched 25 Oct 2026). Bag sizes and weights are the wiki's item infoboxes; safes and COPs near each run are worked out from tac-map pins.";
H.kitsNote = "COPs are not safe. In 0.5 the largest outposts can no longer be captured and became ordinary world locations, and the rest were moved around the island (official devlog). On 26 Oct 2026 a player was killed by an AI team at Outpost Mystic (133,154), which had not been activated. The COP line on each run is only the nearest outpost pin on the tac map, so clear it like any other building.";

// Kit by tier. The armour classes are this guide's floor for each tier (they
// started as the three kits on the games-center page); the items under each
// are read from the wiki item data, cheapest vendor rank first, so a visitor's
// own ranks decide which ones they can buy today.
const sold = (i) => i.sold.filter((s) => s.rank != null);
const minRank = (i) => Math.min(...sold(i).map((s) => s.rank));
function meeting(group, floor) {
  return items.filter((i) => i.group === group && i.prot && ci(i.prot) >= ci(floor) && sold(i).length)
    .sort((a, b) => minRank(a) - minRank(b) || ci(a.prot) - ci(b.prot) || a.weight - b.weight)
    .slice(0, 5).map((i) => i.id);
}
const KITS = {
  light: { t: "Tier 1 and 2", vest: "III", helmet: "IIIA", d: "These runs are about bag space, so wear enough armour to walk away from a bad contact and bring the biggest pack you own." },
  A: { t: "Tier 3", vest: "III+", helmet: "IIIA+", d: "Tier 3 runs on this page go into LAF-held bases and the biggest city. Step up a class, and carry a round the ammo chart rates through III+." },
  best: { t: "Tier 4", vest: "III++", helmet: "IIIA+", d: "Nobody has published what tier 4 AI carry, so plan for more than tier 3: the best armour you can get, and go in with an empty pack." },
};
H.kits = {};
for (const [k, v] of Object.entries(KITS)) {
  H.kits[k] = { t: v.t, d: v.d, vestFloor: v.vest, helmetFloor: v.helmet, vests: meeting("vest", v.vest), helmets: meeting("helmet", v.helmet),
    src: "Armour classes and vendor ranks from each item's wiki page. The class floor per tier is this guide's advice, not a game rule." };
}
write("hideout.json", H);

// ---- weight: the one hard threshold, and the soft ones labelled -----------
const F = read("gzw-field-notes.json");
const weight = {
  gate: F.w.gate,
  gateSrc: HEALTH,
  gateText: "Encumbered at " + F.w.gate + " kg or more: no sprinting or jumping, slower leg stamina regeneration, slower aiming down sights, until you drop below " + F.w.gate + " kg.",
  soft: F.w.tiers.filter((t) => t.b != null && t.b < F.w.gate).map((t) => ({ a: t.a, b: t.b, l: t.l, s: t.s })),
  softText: "Measured by one community Steam guide (\"The Weight & Mobility Bible\", written for 0.4), not a game value. Below " + F.w.gate + " kg, weight is a smooth drain on leg stamina; these are where that guide felt it change.",
};
write("weight.json", weight);

write("items.json", {
  generatedAt: I.generatedAt, fetchedAt: I.fetchedAt, source: I.source, classes: CLS, rules: pick(I.rules, ["ammo", "weapon"]),
  vendors: I.vendors.map((v) => v.name), items,
});
write("loot.json", { fetchedAt: L.fetchedAt, source: L.source, sections: L.sections, items: loot });
write("meta.json", { syncedAt: new Date().toISOString().slice(0, 10), from: "games-center", itemsFetched: I.fetchedAt, lootFetched: L.fetchedAt, hideoutBuilt: H.generatedAt });

const n = (d) => fs.existsSync(d) ? fs.readdirSync(d).length : 0;
console.log("gear", items.length, "with picture", items.filter((i) => i.img).length, "| loot", loot.length, "with picture", loot.filter((i) => i.img).length,
  "| img files", n(path.join(IMG, "items")) + n(path.join(IMG, "loot")));
