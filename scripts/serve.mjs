// Local static server that behaves like the Vercel config: public/ as the root,
// clean URLs (/hideout serves hideout.html). For checking pages before deploy.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const PORT = Number(process.env.PORT || 4321);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png" };

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index";
  let f = path.join(ROOT, p);
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (!path.extname(f) && fs.existsSync(f + ".html")) f += ".html";
  fs.readFile(f, (err, buf) => {
    if (err) { res.writeHead(404, { "content-type": "text/plain" }); return res.end("404"); }
    res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(buf);
  });
}).listen(PORT, () => console.log("gzw-toolkit on http://localhost:" + PORT));
