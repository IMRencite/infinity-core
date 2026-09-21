const urls = [
  "https://hq.imros.io/",
  "https://hq.imros.io/login",
  "https://hq.imros.io/dashboard",
  "https://hq.imros.io/dashboard/daily-reports",
  "https://hq.imros.io/api/operator-console/daily-report",
  "https://hq.imros.io/api/hq/production-runtime",
  "https://imros.io/",
  "https://infinity-runtime.vercel.app/",
];

const results = [];
for (const url of urls) {
  const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "infinity-hq-recovery-probe" } });
  const location = res.headers.get("location");
  results.push({
    url,
    status: res.status,
    location,
    noindex: (res.headers.get("x-robots-tag") ?? "").includes("noindex") || url.includes("hq.imros.io"),
  });
}
console.log(JSON.stringify({ fetchedAt: new Date().toISOString(), results }, null, 2));
