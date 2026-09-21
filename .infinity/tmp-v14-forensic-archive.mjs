import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { createGzip } from "node:zlib";

const SRC = process.cwd();
const DEST_ROOT = join(process.env.USERPROFILE || "C:\\Users\\Antivist", "InfinityForensicV14");
const createdAt = new Date().toISOString();
const SKIP_DIRS = new Set(["node_modules", ".next", ".next-verify"]);
mkdirSync(DEST_ROOT, { recursive: true });

function walk(dir, out = []) {
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(SRC);
const plainPath = join(DEST_ROOT, "current-work-snapshot-20260921.plain.gz");
const archivePath = join(DEST_ROOT, "current-work-snapshot-20260921.aes");
const keyPath = join(DEST_ROOT, "current-work-snapshot-20260921.key");
const metaPath = join(DEST_ROOT, "CURRENT_WORK_SNAPSHOT.meta.json");

const gzip = createGzip({ level: 6 });
const plain = createWriteStream(plainPath);
gzip.pipe(plain);
const donePlain = new Promise((resolve, reject) => {
  plain.on("finish", resolve);
  plain.on("error", reject);
  gzip.on("error", reject);
});
gzip.write(Buffer.from(`${JSON.stringify({ created_at: createdAt, file_count: files.length })}\n`));
let packed = 0;
for (const file of files) {
  const rel = relative(SRC, file).split(sep).join("/");
  let body;
  try {
    body = readFileSync(file);
  } catch {
    continue;
  }
  gzip.write(Buffer.from(`${rel}\n${body.length}\n`));
  gzip.write(body);
  gzip.write(Buffer.from("\n"));
  packed += 1;
}
gzip.end();
await donePlain;

const key = randomBytes(32);
const iv = randomBytes(12);
const cipher = createCipheriv("aes-256-gcm", key, iv);
const out = createWriteStream(archivePath);
const doneOut = new Promise((resolve, reject) => {
  out.on("finish", resolve);
  out.on("error", reject);
});
createReadStream(plainPath).pipe(cipher).pipe(out);
await doneOut;
const tag = cipher.getAuthTag();
writeFileSync(`${archivePath}.tag`, tag);
writeFileSync(keyPath, `${key.toString("base64")}\n${iv.toString("base64")}\n`);
unlinkSync(plainPath);

const digest = createHash("sha256").update(readFileSync(archivePath)).digest("hex");
const meta = {
  created_at: createdAt,
  archive_path_category: "USERPROFILE/InfinityForensicV14",
  source_head: process.env.INFINITY_SOURCE_HEAD || null,
  file_count: packed,
  archive_digest: digest,
  encryption: "YES",
  algorithm: "aes-256-gcm",
};
writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
console.log(JSON.stringify(meta, null, 2));
