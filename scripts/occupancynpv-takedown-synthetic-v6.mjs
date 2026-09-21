import { createServer } from "node:http";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PATH = "/synthetic-unlisted-takedown-v6";
let contained = false;
const server = createServer((req, res) => {
  if (!req.url?.startsWith(PATH)) {
    res.writeHead(404);
    res.end("missing");
    return;
  }
  if (contained) {
    res.writeHead(404, { "x-robots-tag": "noindex, nofollow" });
    res.end("unpublished");
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" });
  res.end(`<!doctype html><html><head><meta name="robots" content="noindex"></head><body><h1>synthetic takedown</h1></body></html>`);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const url = `http://127.0.0.1:${port}${PATH}`;
const before = await fetch(url);
contained = true;
const after = await fetch(url);
server.close();

const out = {
  collected_at: new Date().toISOString(),
  evidence_class: before.ok && after.status === 404 ? "SAFE_SYNTHETIC_EXERCISED" : "FAIL",
  before_status: before.status,
  after_status: after.status,
  after_robots: after.headers.get("x-robots-tag"),
  path: PATH,
  note: "Unlisted synthetic content only. No production article was unpublished.",
};
mkdirSync(join(process.cwd(), ".infinity/blog-os"), { recursive: true });
writeFileSync(join(process.cwd(), ".infinity/blog-os/takedown-synthetic-v6.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
