import { readFileSync, writeFileSync } from "node:fs";

const raw = JSON.parse(readFileSync(".infinity/full-page-autorepair-successor.json", "utf8")) as {
  pageLoop: { files: Array<{ path: string; content: string }> };
};
const wanted = [
  "app/pricing/page.tsx",
  "app/layout.tsx",
  "app/page.tsx",
  "components/premium-venture.tsx",
  "components/validation-grade.tsx",
  "components/site-chrome.tsx",
  "components/venture-footer.tsx",
  "lib/site-schema.ts",
  "next.config.ts",
  "next.config.js",
  "next.config.mjs",
];
const files = raw.pageLoop.files.filter((file) =>
  wanted.includes(file.path.replace(/\\/g, "/")) || /layout\.(tsx|js)$/.test(file.path.replace(/\\/g, "/")),
);
for (const file of files) {
  const safe = file.path.replace(/[\\/]/g, "__");
  writeFileSync(`.infinity/pricing-graph-${safe}`, file.content);
}
process.stdout.write(
  `${JSON.stringify(
    {
      extracted: files.map((file) => ({
        path: file.path,
        bytes: file.content.length,
        useClient: /["']use client["']/.test(file.content),
        useOptimistic: /useOptimistic/.test(file.content),
        useState: /useState|useEffect|useReducer|useTransition/.test(file.content),
        form: /<form|next\/form|useFormStatus/.test(file.content),
        window: /\bwindow\b|\bdocument\b/.test(file.content),
      })),
    },
    null,
    2,
  )}\n`,
);
