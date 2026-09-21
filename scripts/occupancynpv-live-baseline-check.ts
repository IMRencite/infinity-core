async function main() {
  const res = await fetch("https://occupancynpv.com/pricing", { redirect: "follow" });
  const body = await res.text();
  const dpls = [...body.matchAll(/dpl_[A-Za-z0-9]+/g)].map((match) => match[0]);
  console.log(JSON.stringify({
    status: res.status,
    vercelId: res.headers.get("x-vercel-id"),
    startPro: body.includes("Start Professional"),
    startDeal: body.includes("Start One Deal"),
    offerBlock: body.includes("data-offer-block"),
    paidFirst: /Primary offer/.test(body),
    p290: body.includes("$290"),
    p149: body.includes("$149"),
    promoNone: body.includes("data-promotional-offer=\"NONE\""),
    compactHero: body.includes("data-commercial-hero=\"compact\""),
    photoHero: body.includes("pv-hero-photo"),
    dpl: [...new Set(dpls)].slice(0, 8),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
