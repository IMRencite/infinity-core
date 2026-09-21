import { reconstructCreSearchDepthSuccessor } from "../lib/infinity/venture-website-architecture/cre-search-depth-successor.ts";

const s = await reconstructCreSearchDepthSuccessor();
for (const path of [
  "app/early-access/page.tsx",
  "app/early-access/layout.tsx",
  "app/how-it-works/page.tsx",
  "app/tenant-improvement-allowance/page.tsx",
]) {
  const content = s.files.find((file) => file.path.replace(/\\/g, "/") === path)?.content ?? "";
  console.log("\n====", path, "len", content.length, "h1", /<h1/i.test(content), "p", (content.match(/<p[>\s]/g) ?? []).length);
  console.log(content.slice(0, 900));
}
