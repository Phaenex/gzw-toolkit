// Fails if anything about one particular player, or a link into games-center's
// own pages, reaches what this site serves. Also counts what it read, so a run
// that read nothing cannot pass.
//   node scripts/check-clean.mjs [dir]     default: public/
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(process.argv[2] || "public");
const BAD = [
  [/\bNick\b/, "a player's name"],
  [/locker/i, "a player's locker"],
  [/gzw-progress|gzw-field-notes|gzw\.vrank|gzw\.hideoutbuilt/, "games-center's personal data files or keys"],
  [/["'(]\/gzw\//, "a link into games-center's /gzw pages"],
  [/Your current kit/, "the old personal kit card"],
];
let files = 0, hits = 0;
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.(html|js|json|css|txt|md)$/.test(f)) continue;
    files++;
    const s = fs.readFileSync(p, "utf8");
    for (const [re, why] of BAD) {
      const m = s.match(re);
      if (m) { hits++; console.log("FAIL " + path.relative(dir, p) + ": " + why + " ... " + s.slice(Math.max(0, m.index - 50), m.index + 50).replace(/\s+/g, " ")); }
    }
  }
}
walk(dir);
console.log(files + " files read, " + hits + " problems");
if (files < 5) { console.log("FAIL: fewer than 5 files read from " + dir); process.exit(1); }
process.exit(hits ? 1 : 0);
