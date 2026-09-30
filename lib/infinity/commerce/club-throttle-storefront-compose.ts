import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CLUB_THROTTLE_BRAND_PROFILE, CLUB_THROTTLE_PRIMARY_LOGO_SOURCE } from "./brand/club-throttle-profile";
import { CLUB_THROTTLE_CANARY_DESIGN } from "./club-throttle-canary";
import { CLUB_THROTTLE_COLLECTIONS, CLUB_THROTTLE_CORE_TEE, CLUB_THROTTLE_SIZE_CHART } from "./club-throttle-catalog";
import { composeKickstandsUpConcept } from "./creative-media/creative-trend-intelligence";
import {
  ensureCanonicalProductInventory,
  listCanonicalProductsByCollection,
} from "./canonical-product-inventory";
import { seedCanonicalPublishedBlogInventory } from "@/lib/infinity/organic-growth-engine/continuous/published-blog-inventory";
import { composeClubThrottleJournalFiles } from "@/lib/infinity/organic-growth-engine/continuous/club-throttle-journal";
import { OCCUPANCYNPV_BLOG_EDITORIAL_CSS } from "@/lib/infinity/organic-growth-engine/continuous/blog-ux";

export const CLUB_THROTTLE_STOREFRONT_PROJECT = "club-throttle" as const;
export const CLUB_THROTTLE_ARTWORK_PATH = "/commerce-artwork/ride-past-midnight.svg" as const;

export type ComposedStorefrontFile = {
  path: string;
  content: string;
  encoding?: "utf8" | "base64";
};

function logoBase64(cwd = process.cwd()): { content: string; present: boolean } {
  const path = join(cwd, CLUB_THROTTLE_PRIMARY_LOGO_SOURCE);
  if (!existsSync(path)) return { content: "", present: false };
  return { content: readFileSync(path).toString("base64"), present: true };
}

function svgScene(id: string, fill: string, mark: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-label="${id}">
  <rect width="1600" height="900" fill="${fill}"/>
  <path d="M0 640 L1600 520 L1600 900 L0 900 Z" fill="#1b1916"/>
  <path d="M0 720 L1600 640" stroke="#F7F3EC" stroke-width="10" stroke-dasharray="48 36" fill="none"/>
  ${mark}
</svg>`;
}

function editorialWorldSvg(title: string, line: string, fill: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-label="${title}">
  <rect width="1600" height="900" fill="${fill}"/>
  <path d="M0 640 L1600 520 L1600 900 L0 900 Z" fill="#1b1916"/>
  <path d="M0 720 L1600 640" stroke="#F7F3EC" stroke-width="10" stroke-dasharray="48 36" fill="none"/>
  <text x="80" y="220" fill="#F7F3EC" font-size="72" font-family="Impact, Geneva, sans-serif">${title}</text>
  <text x="80" y="300" fill="#E10600" font-size="36" font-family="Georgia, serif">${line}</text>
</svg>`;
}

function garmentWithPrintSvg(label: string, print: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1100" role="img" aria-label="${label}">
  <rect width="900" height="1100" fill="#efeae2"/>
  <path d="M220 180 L450 80 L680 180 L780 300 L740 980 L160 980 L120 300 Z" fill="#111"/>
  <path d="M300 210 L450 120 L600 210" fill="none" stroke="#efeae2" stroke-width="10"/>
  ${print}
</svg>`;
}

export function composeClubThrottleStorefrontFiles(cwd = process.cwd()): {
  files: ComposedStorefrontFile[];
  digest: string;
  logo_bound: boolean;
  founder_dirty_tree_deployed: false;
} {
  const logo = logoBase64(cwd);
  const brand = CLUB_THROTTLE_BRAND_PROFILE;
  const products = ensureCanonicalProductInventory();
  seedCanonicalPublishedBlogInventory();
  const concept = composeKickstandsUpConcept();
  const publicCollections = CLUB_THROTTLE_COLLECTIONS.map((row) => ({
    slug: row.slug,
    name: row.name,
    product_count: listCanonicalProductsByCollection("club-throttle", row.slug).length,
    blurb: row.blurb,
    story: row.story,
    image: `/visual/collection-${row.slug}.svg`,
    presentation: listCanonicalProductsByCollection("club-throttle", row.slug).length ? "SHOPPABLE" : "COMING_SOON",
  }));
  const files: ComposedStorefrontFile[] = [
    {
      path: "package.json",
      content: `${JSON.stringify({
        name: "club-throttle",
        private: true,
        scripts: { build: "next build", start: "next start" },
        dependencies: {
          next: "16.2.11",
          react: "19.2.4",
          "react-dom": "19.2.4",
          typescript: "5.9.2",
          "@types/node": "20.19.0",
          "@types/react": "19.2.2",
          "@types/react-dom": "19.2.2",
        },
      }, null, 2)}\n`,
    },
    {
      path: "vercel.json",
      content: `${JSON.stringify({
        framework: "nextjs",
        buildCommand: "next build",
        redirects: [
          {
            source: "/:path*",
            has: [{ type: "host", value: "www.clubthrottle.com" }],
            destination: "https://clubthrottle.com/:path*",
            permanent: true,
          },
        ],
      }, null, 2)}\n`,
    },
    {
      path: "next.config.mjs",
      content: `/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true, images: { unoptimized: true }, trailingSlash: false };
export default nextConfig;
`,
    },
    {
      path: "next-env.d.ts",
      content: `/// <reference types="next" />
/// <reference types="next/image-types/global" />
`,
    },
    {
      path: "tsconfig.json",
      content: `${JSON.stringify({
        compilerOptions: {
          target: "ES2017",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "react-jsx",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./*"] },
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      }, null, 2)}\n`,
    },
    {
      path: "lib/brand.ts",
      content: `export const brand = ${JSON.stringify(brand, null, 2)} as const;
`,
    },
    {
      path: "lib/catalog.ts",
      content: `export const sizes = ${JSON.stringify(CLUB_THROTTLE_SIZE_CHART, null, 2)} as const;
export const coreTee = ${JSON.stringify((({ territory_id: _territory, ...rest }) => rest)(CLUB_THROTTLE_CORE_TEE), null, 2)} as const;
export const collections = ${JSON.stringify(publicCollections, null, 2)} as const;
export const products = ${JSON.stringify(products, null, 2)} as const;
export function productsInCollection(slug: string) {
  return products.filter((row) => row.collection_slug === slug);
}
`,
    },
    {
      path: "app/globals.css",
      content: `:root { --ink:${brand.colors.ink}; --paper:${brand.colors.paper}; --canvas:${brand.colors.canvas}; --mist:${brand.colors.mist}; --charcoal:${brand.colors.charcoal}; --accent:${brand.colors.accent}; --muted:${brand.colors.muted}; }
*{box-sizing:border-box} html,body{margin:0;background:var(--paper);color:var(--ink);font-family:"Segoe UI",system-ui,sans-serif}
a{color:inherit;text-decoration:none} img{max-width:100%;height:auto;display:block}
.shell{min-height:100vh;display:flex;flex-direction:column}
.util{background:var(--mist);padding:.45rem 4vw;font-size:.8rem;color:var(--muted)}
.mast{display:grid;grid-template-columns:auto 1fr auto;gap:1rem;align-items:center;padding:.85rem 4vw;background:var(--canvas);border-bottom:1px solid #e4ddd3}
.search{width:100%;padding:.8rem .95rem;border:1px solid #d8d0c6;background:var(--paper)}
.cart-link{font-size:.9rem}
.cats{display:flex;flex-wrap:wrap;gap:.9rem 1.1rem;padding:.7rem 4vw;background:var(--canvas);border-bottom:1px solid #e4ddd3;font-size:.92rem}
.brand-mark{display:flex;align-items:center;background:transparent}
.brand-mark img{height:88px;width:auto;background:transparent;padding:0;mix-blend-mode:multiply}
.hero{display:grid;grid-template-columns:1.1fr .9fr;min-height:28rem}
.hero-copy{padding:3.2rem 4vw;background:var(--charcoal);color:var(--paper)}
.hero-copy h1{font-size:clamp(2.4rem,6vw,4.6rem);line-height:.95;margin:.3rem 0 1rem;letter-spacing:-.04em}
.cta{display:inline-block;margin-top:1rem;background:var(--accent);color:#fff;padding:.85rem 1.15rem;letter-spacing:.06em;text-transform:uppercase;font-size:.78rem}
.cta:focus-visible,.search:focus-visible,a:focus-visible{outline:3px solid #7dd3fc;outline-offset:3px}
.band{padding:2.4rem 4vw}
.band h2{margin:0 0 1rem}
.tiles,.grid,.releases{display:grid;grid-template-columns:repeat(auto-fit,minmax(16rem,1fr));gap:1.2rem;justify-content:stretch;width:100%}
.card,.tile{background:var(--canvas);border:1px solid #e4ddd3}
.tile img,.card img,.gallery img{width:100%;aspect-ratio:16/10;object-fit:cover;background:#111}
.tee{position:relative}.tee img.garment{width:100%;aspect-ratio:4/5;object-fit:cover;background:#efeae2}
.tee img.mark{position:absolute;left:36%;top:34%;width:28%;height:auto;background:#fff;padding:.2rem}
.pad{padding:1rem}
.sheet,.about-grid,.pdp,.commerce-shell{width:calc(100% - 8vw);max-width:80rem;margin-inline:auto}
.sheet{padding:2.4rem 0 4rem}
.about-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:2rem;align-items:start}
.about-grid section{grid-column:1/-1}
.kicker{letter-spacing:.14em;text-transform:uppercase;font-size:.72rem;color:var(--accent)}
.pdp{display:grid;grid-template-columns:1.1fr .9fr;gap:2rem;padding:2rem 0 4rem}
.buy{background:var(--canvas);border:1px solid #e4ddd3;padding:1.2rem}
.buy button,.buy select{width:100%;margin:.35rem 0;padding:.8rem;border:1px solid #d8d0c6}
.buy .cta{border:0;width:100%}
.note{font-size:.88rem;color:var(--muted)}
table{width:100%;border-collapse:collapse;background:var(--canvas)}
th,td{border:1px solid #e4ddd3;padding:.55rem .7rem;text-align:left}
.floor{margin-top:auto;background:var(--canvas);border-top:1px solid #e4ddd3;padding:2rem 4vw}
.floor nav{display:flex;flex-wrap:wrap;gap:.8rem 1.1rem;margin-bottom:1rem}
.rel-row{font-size:.82rem;color:var(--muted)}
.rel-row a{text-decoration:underline}
form{display:grid;gap:.7rem;max-width:28rem}
input,textarea,select{padding:.75rem;border:1px solid #d8d0c6;background:var(--canvas)}
.release-card,.card .tee,.release-card .tee{max-width:none;width:100%}
.release-card .tee,.card .tee{position:relative;aspect-ratio:4/5;overflow:hidden;background:#efeae2}
.release-card .tee img.garment,.card .tee img.garment{width:100%;height:100%;object-fit:contain}
@media(max-width:800px){.mast{grid-template-columns:1fr 1fr;}.search{grid-column:1/-1}.hero,.pdp,.about-grid{grid-template-columns:1fr}.brand-mark img{height:64px}.releases{grid-template-columns:1fr}}
${OCCUPANCYNPV_BLOG_EDITORIAL_CSS}
`,
    },
    {
      path: "app/components/brand-mark.tsx",
      content: `import { brand } from "../../lib/brand";
export function BrandMark({ size = 88 }: { size?: number }) {
  return <span className="brand-mark"><img src={brand.primary_logo_path} alt={brand.public_name} height={size} /></span>;
}
`,
    },
    {
      path: "app/components/header.tsx",
      content: `"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent } from "react";
import { BrandMark } from "./brand-mark";

const CATS = [
  ["/shop", "Shop"],
  ["/collections/throttle-core", "New"],
  ["/collections", "Collections"],
  ["/shop", "T-Shirts"],
  ["/suggest-a-design", "Suggest a Design"],
  ["/journal", "Journal"],
  ["/about", "About"],
] as const;

export function StoreHeader() {
  const router = useRouter();
  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get("q") ?? "");
    router.push(q ? \`/search?q=\${encodeURIComponent(q)}\` : "/shop");
  }
  return (
    <>
      <div className="util">Preview collection. Launching soon. Printed after payment when checkout opens.</div>
      <div className="mast">
        <Link href="/" aria-label="Club Throttle"><BrandMark /></Link>
        <form onSubmit={onSearch}><input className="search" name="q" placeholder="Search shirts, collections, marks" /></form>
        <Link className="cart-link" href="/cart">Bag</Link>
      </div>
      <nav className="cats">{CATS.map(([href, label]) => <Link key={label} href={href}>{label}</Link>)}</nav>
    </>
  );
}
`,
    },
    {
      path: "app/components/footer.tsx",
      content: `import Link from "next/link";
import { brand } from "../../lib/brand";
export function StoreFooter() {
  return (
    <footer className="floor">
      <nav>
        <Link href="/shop">Shop</Link>
        <Link href="/collections">Collections</Link>
        <Link href="/suggest-a-design">Suggest a Design</Link>
        <Link href="/journal">Journal</Link>
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
      </nav>
      <p className="rel-row">
        <Link href="/privacy">Privacy Policy</Link> | <Link href="/terms">Terms of Service</Link> | <Link href="/sitemap">Sitemap</Link> | <a href={brand.relationship_imros}>An Infinity OS Venture</a> | <a href={brand.relationship_imr}>By IMR</a>
      </p>
    </footer>
  );
}
`,
    },
    {
      path: "middleware.ts",
      content: `import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (host === "www.clubthrottle.com") {
    const dest = new URL(request.url);
    dest.hostname = "clubthrottle.com";
    dest.protocol = "https:";
    dest.port = "";
    return NextResponse.redirect(dest, 308);
  }
  return NextResponse.next();
}
`,
    },
    {
      path: "app/layout.tsx",
      content: `import type { Metadata } from "next";
import "./globals.css";
import { StoreHeader } from "./components/header";
import { StoreFooter } from "./components/footer";
import { brand } from "../lib/brand";

export const metadata: Metadata = {
  title: brand.public_name,
  description: "Original rider apparel for the road after dark.",
  metadataBase: new URL("https://clubthrottle.com"),
  icons: { icon: brand.favicon_path },
  openGraph: { title: brand.public_name, images: [brand.og_image_path], url: "https://clubthrottle.com" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell" data-venture="club-throttle">
          <StoreHeader />
          <main>{children}</main>
          <StoreFooter />
        </div>
      </body>
    </html>
  );
}
`,
    },
    {
      path: "app/page.tsx",
      content: `import Link from "next/link";
      import { collections, products } from "../lib/catalog";

export const metadata = { alternates: { canonical: "https://clubthrottle.com" } };

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">Rider apparel</p>
          <h1>Clothes for the hour the ride actually starts.</h1>
          <p>Club Throttle makes original marks for night pavement, garage light, and the road home. Not manufacturer merch. Not a costume club.</p>
          <Link className="cta" href="/shop">Shop the core tee</Link>
        </div>
        <img src="/visual/hero-night.svg" alt="Night road with a redline tick" />
      </section>
      <section className="band">
        <h2>Shop by collection</h2>
        <div className="tiles">
          {collections.map((row) => (
            <Link className="tile" key={row.slug} href={\`/collections/\${row.slug}\`}>
              <img src={row.image} alt={row.name} />
              <div className="pad"><strong>{row.name}</strong><p>{row.blurb}</p></div>
            </Link>
          ))}
        </div>
      </section>
      <section className="band">
        <h2>New releases</h2>
        <div className="releases">
          {products.slice(0, 3).map((product) => (
            <Link className="card release-card" key={product.product_id} href={\`/products/\${product.slug}\`}>
              <div className="tee"><img className="garment" src={product.primary_image} alt={\`\${product.title} on a black heavyweight tee\`} /></div>
              <div className="pad"><p>T-Shirt</p><h3>{product.title}</h3><p>\${product.price_usd}</p><p>Review in shop</p></div>
            </Link>
          ))}
        </div>
      </section>
      <section className="band">
        <h2>Club Throttle Core</h2>
        <p>The approved mark on a documented heavy cotton tee. Air around the print. Black only for now.</p>
        <Link className="cta" href="/collections/throttle-core">Open Throttle Core</Link>
      </section>
      <section className="hero">
        <img src="/visual/collection-after-dark.svg" alt="After Dark night ride" />
        <div className="hero-copy">
          <p className="kicker">After Dark</p>
          <h2>A collection for the ride home.</h2>
          <p>Night city, wet asphalt, and clothes that leave with you. New marks land here when they earn the hour.</p>
          <Link className="cta" href="/collections/after-dark">See After Dark</Link>
        </div>
      </section>
      <section className="band">
        <h2>Suggest a design</h2>
        <p>Tell us the ride, the mark, or the hour. A suggestion is a note, not a command, and not a promise to print.</p>
        <Link className="cta" href="/suggest-a-design">How suggestions work</Link>
      </section>
      <section className="band">
        <h2>Journal</h2>
        <div className="grid">
          <Link className="card" href="/journal">
            <img src="/visual/journal-cover.svg" alt="Journal" />
            <div className="pad"><h3>What Club Throttle is for</h3><p>The shop, the hour, and what we will not print.</p></div>
          </Link>
        </div>
      </section>
    </>
  );
}
`,
    },
    {
      path: "app/shop/page.tsx",
      content: `import Link from "next/link";
import { collections, products } from "../../lib/catalog";
export const metadata = { title: "Shop · Club Throttle" };
export default function ShopPage() {
  return (
    <article className="sheet">
      <p className="kicker">Shop</p>
      <h1>Original Club Throttle apparel</h1>
      <p>The opening collection is launching soon. Browse the concepts, read garment facts, and come back when checkout opens. Nothing here is a borrowed manufacturer reprint.</p>
      <p>Black tees first. Sizes S through 2XL on the Gildan Heavy Cotton chart. Filter by collection as more garments land.</p>
      <div className="tiles" style={{margin:"1rem 0"}}>
        {collections.map((row) => <Link key={row.slug} className="tile" href={\`/collections/\${row.slug}\`}><img src={row.image} alt="" /><div className="pad">{row.name}</div></Link>)}
      </div>
      <div className="grid">
        {products.map((product) => (
          <Link className="card" key={product.product_id} href={\`/products/\${product.slug}\`}>
            <div className="tee"><img className="garment" src={product.primary_image} alt={\`\${product.title} on a black tee\`} /></div>
            <div className="pad"><p>T-Shirt · Black</p><h2>{product.title}</h2><p>\${product.price_usd}</p></div>
          </Link>
        ))}
      </div>
    </article>
  );
}
`,
    },
    {
      path: "app/search/page.tsx",
      content: `import Link from "next/link";
import { collections, products } from "../../lib/catalog";
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.toLowerCase();
  const hits = [...products.filter((row) => row.title.toLowerCase().includes(query)), ...collections.filter((row) => \`\${row.name} \${row.blurb}\`.toLowerCase().includes(query))];
  return (
    <article className="sheet">
      <h1>Search</h1>
      <p>{hits.length} result{hits.length === 1 ? "" : "s"}{q ? \` for “\${q}”\` : ""}.</p>
      <div className="grid">
        {products.filter((row) => !q || row.title.toLowerCase().includes(query)).map((product) => (
          <Link className="card" key={product.product_id} href={\`/products/\${product.slug}\`}><img src={product.primary_image} alt="" /><div className="pad">{product.title}</div></Link>
        ))}
        {collections.filter((row) => !q || \`\${row.name} \${row.blurb}\`.toLowerCase().includes(query)).map((row) => (
          <Link className="card" key={row.slug} href={\`/collections/\${row.slug}\`}><img src={row.image} alt="" /><div className="pad">{row.name}</div></Link>
        ))}
      </div>
    </article>
  );
}
`,
    },
    {
      path: "app/collections/page.tsx",
      content: `import Link from "next/link";
import { collections } from "../../lib/catalog";
export const metadata = { title: "Collections · Club Throttle" };
export default function CollectionsPage() {
  return (
    <article className="sheet">
      <p className="kicker">Collections</p>
      <h1>How Club Throttle is grouped</h1>
      <p>Collections follow the ride: the house mark, night rides, redline, the open road, and the social world around the bike. A collection is a place a design has to earn, not a folder we fill to look busy.</p>
      <p>Shirts that are ready sit in Throttle Core and After Dark. Other collections stay as coming-soon notes so we do not pretend an empty rack is a finished shop.</p>
      <div className="tiles">
        {collections.map((row) => (
          <Link className="tile" key={row.slug} href={\`/collections/\${row.slug}\`}>
            <img src={row.image} alt={row.name} />
            <div className="pad"><h2>{row.name}</h2><p>{row.blurb}</p><p>{row.presentation === "COMING_SOON" ? "Not on the rack yet" : \`\${row.product_count} ready\`}</p></div>
          </Link>
        ))}
      </div>
    </article>
  );
}
`,
    },
    {
      path: "app/collections/[slug]/page.tsx",
      content: `import Link from "next/link";
import { notFound } from "next/navigation";
import { collections, productsInCollection } from "../../../lib/catalog";

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = collections.find((row) => row.slug === slug);
  if (!collection) notFound();
  const items = productsInCollection(collection.slug);
  const related = collections.filter((row) => row.slug !== collection.slug).slice(0, 3);
  return (
    <article className="sheet">
      <img src={collection.image} alt={collection.name} />
      <p className="kicker">Collection</p>
      <h1>{collection.name}</h1>
      <p>{collection.story}</p>
      <h2>What belongs here</h2>
      <p>{collection.blurb} These are motorcycle streetwear designs for riders — not mechanic uniforms and not a repair-shop catalog.</p>
      {items.length ? (
        <div className="grid">
          {items.map((product) => (
            <Link className="card" key={product.product_id} href={\`/products/\${product.slug}\`}>
              <div className="tee"><img className="garment" src={product.primary_image} alt={\`\${product.title} on a black tee\`} /></div>
              <div className="pad"><h2>{product.title}</h2><p>\${product.price_usd}</p></div>
            </Link>
          ))}
        </div>
      ) : (
        <div data-collection-state="coming">
          <p>This collection is being built. Shop Throttle Core for the shirts that are ready, or read the Journal while new designs land.</p>
          <p><Link href="/collections/throttle-core">Shop Throttle Core</Link></p>
        </div>
      )}
      <h2>Related collections</h2>
      <div className="tiles">
        {related.map((row) => (
          <Link className="tile" key={row.slug} href={\`/collections/\${row.slug}\`}>
            <img src={row.image} alt={row.name} />
            <div className="pad"><strong>{row.name}</strong><p>{row.blurb}</p></div>
          </Link>
        ))}
      </div>
      <p><Link href="/collections">All collections</Link> · <Link href="/shop">Shop</Link> · <Link href="/journal">Journal</Link></p>
    </article>
  );
}
`,
    },
    {
      path: "app/products/page.tsx",
      content: `import { redirect } from "next/navigation";
export default function ProductsIndex() { redirect("/shop"); }
`,
    },
    {
      path: "app/products/club-throttle-core-tee/page.tsx",
      content: `"use client";
import Link from "next/link";
import { coreTee, sizes } from "../../../lib/catalog";

export default function ProductPage() {
  function add() {
    const raw = window.localStorage.getItem("ct-bag") ?? "[]";
    const bag = JSON.parse(raw) as Array<{ slug: string; qty: number }>;
    const found = bag.find((row) => row.slug === coreTee.slug);
    if (found) found.qty += 1; else bag.push({ slug: coreTee.slug, qty: 1 });
    window.localStorage.setItem("ct-bag", JSON.stringify(bag));
    window.location.href = "/cart";
  }
  return (
    <article>
      <div className="pdp">
        <div className="gallery">
          <div className="tee"><img className="garment" src="/visual/product-core-garment.svg" alt="Club Throttle Core Tee on a black heavyweight shirt" /></div>
          <div className="tee"><img className="garment" src="/visual/product-core-detail.svg" alt="Print detail on the Core Tee" /></div>
        </div>
        <div className="buy">
          <p className="kicker">T-Shirt</p>
          <h1>{coreTee.title}</h1>
          <p>\${coreTee.price_usd}</p>
          <p>Color: Black</p>
          <label>Size
            <select name="size" defaultValue="M">{sizes.map((row) => <option key={row.size_name}>{row.size_name}</option>)}</select>
          </label>
          <p><a href="#size-guide">Size guide</a></p>
          <label>Quantity <input type="number" min={1} defaultValue={1} /></label>
          <button className="cta" type="button" onClick={add}>Add to bag</button>
          <p className="note">Preview only. Checkout is launching soon, so the bag will not charge a card.</p>
          <p className="note">{coreTee.shipping}</p>
          <p className="note">{coreTee.returns}</p>
        </div>
      </div>
      <section className="sheet">
        <h2>What this is</h2>
        <p>The Club Throttle mark on a Gildan Heavy Cotton tee. This is core branded apparel: the approved identity, not a second invented logo and not a slogan stacked on the chest.</p>
        <h2>Design story</h2>
        <p>Throttle Core exists because the shop already has a mark. The white field, the black throttle form, and the red ticks are the identity. The shirt keeps that field intact so the mark stays readable on black cotton. It was designed for the ride home and the next morning, not for a costume rack.</p>
        <h2>Product facts</h2>
        <ul>
          <li>Garment: {coreTee.garment.name}</li>
          <li>Materials: {coreTee.garment.materials}</li>
          <li>Weight: {coreTee.garment.fabric_weight}</li>
          <li>Construction: {coreTee.garment.construction}</li>
          <li>Fit: {coreTee.garment.fit}</li>
          <li>Print: {coreTee.garment.print_method}</li>
          <li>Sizes: {sizes.map((row) => row.size_name).join(", ")}</li>
          <li>Color: black</li>
        </ul>
        <h2>Fit</h2>
        <p>Classic unisex. If you like a heavy cotton tee that is not slim through the body, stay with your usual Gildan Heavy Cotton size. If you want it closer, size down one.</p>
        <h2 id="size-guide">Size guide</h2>
        <p>Measurements are garment measurements from the Gildan 5300 public size chart, in inches. Width is across the chest. Length is from the high point of the shoulder.</p>
        <table><thead><tr><th>Size</th><th>Width</th><th>Length</th></tr></thead>
          <tbody>{sizes.map((row) => <tr key={row.size_name}><td>{row.size_name}</td><td>{row.body_width} in</td><td>{row.body_length} in</td></tr>)}</tbody>
        </table>
        <h2>Care</h2>
        <p>{coreTee.garment.care}</p>
        <h2>Shipping</h2>
        <p>{coreTee.shipping}</p>
        <h2>Returns</h2>
        <p>{coreTee.returns}</p>
        <p><Link href="/collections/throttle-core">Throttle Core</Link> · <Link href="/shop">Shop</Link> · <Link href="/journal">Journal</Link></p>
      </section>
    </article>
  );
}
`,
    },
    {
      path: "app/products/kickstands-up-tee/page.tsx",
      content: `"use client";
import Link from "next/link";
import { products, sizes } from "../../../lib/catalog";

export default function KickstandsUpPage() {
  const product = products.find((row) => row.slug === "kickstands-up-tee") ?? products[0];
  function add() {
    const raw = window.localStorage.getItem("ct-bag") ?? "[]";
    const bag = JSON.parse(raw) as Array<{ slug: string; qty: number }>;
    const found = bag.find((row) => row.slug === product.slug);
    if (found) found.qty += 1; else bag.push({ slug: product.slug, qty: 1 });
    window.localStorage.setItem("ct-bag", JSON.stringify(bag));
    window.location.href = "/cart";
  }
  return (
    <article>
      <div className="pdp">
        <div className="gallery">
          <div className="tee"><img className="garment" src={product.primary_image} alt="Kickstands Up printed on a black heavyweight tee" /></div>
        </div>
        <div className="buy">
          <p className="kicker">After Dark</p>
          <h1>{product.title}</h1>
          <p>\${product.price_usd}</p>
          <p>Color: Black</p>
          <label>Size <select name="size" defaultValue="M">{sizes.map((row) => <option key={row.size_name}>{row.size_name}</option>)}</select></label>
          <button className="cta" type="button" onClick={add}>Add to bag</button>
          <p className="note">Preview collection. Launching soon. This is original Club Throttle type for the moment the meet ends and the road starts — small chest mark, large back print.</p>
        </div>
      </div>
      <section className="sheet">
        <h2>The design</h2>
        <p>Kickstands Up is a night-ride shirt: small front Club Throttle mark, large back type. It is not a manufacturer reprint and not a fake club patch.</p>
        <p><Link href="/collections/after-dark">After Dark</Link> · <Link href="/shop">Shop</Link></p>
      </section>
    </article>
  );
}
`,
    },
    {
      path: "app/cart/page.tsx",
      content: `"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { coreTee } from "../../lib/catalog";
export default function CartPage() {
  const [qty, setQty] = useState(0);
  useEffect(() => {
    const bag = JSON.parse(window.localStorage.getItem("ct-bag") ?? "[]") as Array<{ slug: string; qty: number }>;
    setQty(bag.find((row) => row.slug === coreTee.slug)?.qty ?? 0);
  }, []);
  function remove() {
    window.localStorage.setItem("ct-bag", "[]");
    setQty(0);
  }
  return (
    <article className="sheet">
      <h1>Bag</h1>
      {qty < 1 ? <p>Your bag is empty. <Link href="/shop">Continue through the shop</Link>.</p> : (
        <div className="card" style={{display:"grid",gridTemplateColumns:"140px 1fr",gap:"1rem"}}>
          <div className="tee"><img className="garment" src="/visual/product-core-garment.svg" alt="" /></div>
          <div className="pad">
            <h2>{coreTee.title}</h2>
            <p>Black · review only</p>
            <p>Qty {qty} · \${coreTee.price_usd * qty}</p>
            <button type="button" onClick={remove}>Remove</button>
          </div>
        </div>
      )}
      <p>Subtotal: \${coreTee.price_usd * qty}</p>
      <p>Shipping: not started. Checkout is closed, so nothing is charged and nothing is printed.</p>
      <p><button className="cta" type="button" disabled>Checkout unavailable</button></p>
    </article>
  );
}
`,
    },
    {
      path: "app/about/page.tsx",
      content: `import Link from "next/link";
export const metadata = { title: "About · Club Throttle" };
export default function AboutPage() {
  return (
    <article className="sheet about-grid">
      <div>
        <p className="kicker">About</p>
        <h1>Club Throttle is a motorcycle street brand</h1>
        <p>Club Throttle makes original rider apparel for night rides, garage meets, and the road home. It exists because most motorcycle-adjacent clothing is either a manufacturer reprint, a fake club patch, or a blank streetwear tee with a throttle pun.</p>
        <h2>Who it serves</h2>
        <p>Street and sport riders, night commuters, and the people who show up before the kickstands come up. It is not a membership club, not a racing team, and not mechanic workwear.</p>
        <h2>The ride</h2>
        <p>Street lights in the visor. Cold starts. Gas stops. Parking-lot meets. The clothes have to read as that life and still look like themselves the next morning.</p>
      </div>
      <img src="/visual/hero-night.svg" alt="Night road Club Throttle belongs to" />
      <section>
        <h2>Collections</h2>
        <p>Throttle Core is the house mark. After Dark is the night ride. Redline is acceleration. Open Road is the long way home. Garage Culture is riders, motorcycles, and the social world around the ride.</p>
        <h2>How a design becomes a shirt</h2>
        <p>A concept has to fit Club Throttle, survive an originality and IP check, then land on a real garment with a size chart, care, and a print area we can state. Suggest a Design is a note from the road, not permission to publish.</p>
        <h2>Shopping</h2>
        <p><Link href="/shop">Shop</Link> · <Link href="/collections">Collections</Link> · <Link href="/suggest-a-design">Suggest a Design</Link> · <Link href="/journal">Journal</Link></p>
      </section>
    </article>
  );
}
`,
    },
    {
      path: "app/contact/page.tsx",
      content: `import Link from "next/link";
export const metadata = { title: "Contact · Club Throttle" };
export default function ContactPage() {
  return (
    <article className="sheet">
      <img src="/visual/suggest.svg" alt="A bench note for the shop" />
      <p className="kicker">Contact</p>
      <h1>Talk to the shop</h1>
      <p>Use this page for product questions and design notes. We have not published a public mailbox yet, so we will not invent an address for you to write into the void.</p>
      <h2>Product questions</h2>
      <p>Size, fabric, print, and care are on the <Link href="/products/club-throttle-core-tee">Core Tee</Link> page. If something there is unclear, say so through Suggest a Design and mark it as a product question.</p>
      <h2>Orders</h2>
      <p>Checkout is launching soon. There is no live order to track and no shipment to chase yet.</p>
      <h2>Design ideas</h2>
      <p><Link href="/suggest-a-design">Suggest a Design</Link> is the path for marks, hours, and garments you want to exist. It is not a commission desk.</p>
      <h2>Partnerships</h2>
      <p>Dealer, creator, or shop partnerships are not open until the first live apparel orders are running. Do not send a brand kit to an unpublished inbox.</p>
    </article>
  );
}
`,
    },
    {
      path: "app/suggest-a-design/page.tsx",
      content: `"use client";
import { FormEvent, useState } from "react";
export default function SuggestPage() {
  const [status, setStatus] = useState("");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/design-suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
    const json = await response.json();
    setStatus(json.status ?? "RECEIVED");
  }
  return (
    <article className="sheet">
      <img src="/visual/suggest.svg" alt="A notebook on a garage bench" />
      <p className="kicker">Suggest a Design</p>
      <h1>Bring the hour. We will decide if it belongs.</h1>
      <p>A suggestion is a note from the road: a mark, a garment, a collection it might sit in. It is not permission to publish, not a paid commission, and not a promise we will print it.</p>
      <h2>What helps</h2>
      <ul>
        <li>The ride or place it belongs — night city, garage, open road.</li>
        <li>Who would wear it.</li>
        <li>What it should not copy — no manufacturer marks, no club rockers.</li>
      </ul>
      <h2>What happens next</h2>
      <p>We read it, drop duplicates, check whether it fits Club Throttle, and keep it as demand. If it becomes a shirt, it still has to pass artwork, garment facts, and the shop's own taste. You will not get a production date from this form.</p>
      <h2>Boundaries</h2>
      <p>Do not send manufacturer logos, sports marks, or anyone else's club colors. Do not send secrets. Optional email is only for a later note if you ask for one.</p>
      <form onSubmit={onSubmit}>
        <textarea name="suggestion_text" required placeholder="The mark, the ride, the hour" />
        <input name="submitter_email" type="email" placeholder="Email if you want a later note" />
        <label><input type="checkbox" name="notification_consent" /> Notify me only if this idea is taken further</label>
        <button className="cta" type="submit">Send suggestion</button>
      </form>
      {status ? <p>Received. This is not authorization to publish.</p> : null}
    </article>
  );
}
`,
    },
    {
      path: "app/t-shirts/page.tsx",
      content: `import { redirect } from "next/navigation";
export default function TShirtsRedirect() { redirect("/shop"); }
`,
    },
    ...composeClubThrottleJournalFiles(),
    {
      path: "app/privacy/page.tsx",
      content: `export const metadata = { title: "Privacy Policy · Club Throttle" };
export default function PrivacyPage() {
  return (
    <article className="sheet">
      <h1>Privacy Policy</h1>
      <p>This policy is for clubthrottle.com, operated as Club Throttle. It covers the public shop, design suggestions, and the bag stored in your browser.</p>
      <h2>What we collect</h2>
      <p>If you send a design suggestion, we receive the text you type and any email you choose to leave. The bag on this site is stored in your browser only. We do not run live checkout, so we do not collect card numbers here.</p>
      <h2>How it is used</h2>
      <p>Suggestion text is reviewed for brand fit and demand. Email is used only if you asked for a later note. We do not sell this information.</p>
      <h2>What we do not do</h2>
      <p>We do not invent a newsletter you did not join. We do not publish your suggestion as a product without our own design work.</p>
    </article>
  );
}
`,
    },
    {
      path: "app/terms/page.tsx",
      content: `export const metadata = { title: "Terms of Service · Club Throttle" };
export default function TermsPage() {
  return (
    <article className="sheet">
      <h1>Terms of Service</h1>
      <p>These terms cover use of clubthrottle.com. Club Throttle sells original apparel when live checkout is open. Today the shop is open for browsing, sizing, and design notes. No payment is taken on this site yet.</p>
      <h2>Products</h2>
      <p>Garment facts come from manufacturer or provider data. A product page is not a promise that checkout is open. Print-on-demand shirts are made after payment, so production starts only when a live paid order exists.</p>
      <h2>Suggestions</h2>
      <p>Sending a design idea does not transfer a duty to print it and does not make you a collaborator unless we say so in writing.</p>
      <h2>Intellectual property</h2>
      <p>The Club Throttle mark is an existing brand identity. Do not send other people's marks. We will not print manufacturer logos or club insignia we do not own.</p>
    </article>
  );
}
`,
    },
    {
      path: "app/sitemap/page.tsx",
      content: `import Link from "next/link";
const ROUTES = ["/", "/shop", "/search", "/collections", "/collections/throttle-core", "/collections/after-dark", "/products/club-throttle-core-tee", "/products/kickstands-up-tee", "/cart", "/suggest-a-design", "/journal", "/about", "/contact", "/privacy", "/terms"];
export default function SitemapPage() {
  return <article className="sheet"><h1>Sitemap</h1><ul>{ROUTES.map((href) => <li key={href}><Link href={href}>{href}</Link></li>)}</ul></article>;
}
`,
    },
    {
      path: "app/sitemap.ts",
      content: `export default function sitemap() {
  const base = "https://clubthrottle.com";
  return ["", "/shop", "/collections", "/products/club-throttle-core-tee", "/about", "/contact", "/suggest-a-design", "/journal", "/privacy", "/terms"].map((path) => ({ url: \`\${base}\${path}\` }));
}
`,
    },
    {
      path: "app/not-found.tsx",
      content: `export default function NotFound() { return <article className="sheet"><h1>That road is closed</h1><p>The page is not in this shop.</p></article>; }`,
    },
    {
      path: "app/api/health/route.ts",
      content: `import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ ok: true, venture: "club-throttle", live_paid_orders: false }); }
`,
    },
    {
      path: "app/api/design-suggestions/route.ts",
      content: `import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ status: "RECEIVED", is_authorization_to_publish: false, venture_id: "club-throttle" });
}
`,
    },
    { path: "public/visual/hero-night.svg", content: editorialWorldSvg("After Dark", "street lights · night rides · the hour the road opens", "#14181f") },
    { path: "public/visual/collection-after-dark.svg", content: editorialWorldSvg("After Dark", "helmets on, street lights in the visor", "#101820") },
    { path: "public/visual/collection-redline.svg", content: editorialWorldSvg("Redline", "the last honest number", "#1a1512") },
    { path: "public/visual/collection-open-road.svg", content: editorialWorldSvg("Open Road", "lane lines, gas stops, the long way home", "#24303a") },
    { path: "public/visual/collection-garage-culture.svg", content: editorialWorldSvg("Garage Culture", "bikes lined up · engines warming", "#2a241c") },
    { path: "public/visual/collection-throttle-core.svg", content: editorialWorldSvg("Throttle Core", "the house mark, printed clean", "#161412") },
    { path: "public/visual/product-core-garment.svg", content: garmentWithPrintSvg("Club Throttle Core Tee on a black heavyweight shirt", `<rect x="360" y="360" width="180" height="120" fill="#fff"/><text x="450" y="430" text-anchor="middle" fill="#111" font-size="22" font-family="Impact, sans-serif">CT</text>`) },
    { path: "public/visual/product-kickstands-up-garment.svg", content: garmentWithPrintSvg("Kickstands Up tee, actual garment with actual Club Throttle type", `<text x="450" y="520" text-anchor="middle" fill="#E10600" font-size="42" font-family="Impact, sans-serif">KICKSTANDS</text><text x="450" y="570" text-anchor="middle" fill="#F7F3EC" font-size="42" font-family="Impact, sans-serif">UP</text>`) },
    { path: "public/visual/product-core-front.svg", content: garmentWithPrintSvg("Core tee garment", `<rect x="360" y="360" width="180" height="120" fill="#fff"/>`) },
    { path: "public/visual/product-core-detail.svg", content: garmentWithPrintSvg("Core tee print detail", `<rect x="300" y="340" width="300" height="200" fill="#fff"/><text x="450" y="460" text-anchor="middle" fill="#111" font-size="28" font-family="Impact, sans-serif">CLUB THROTTLE</text>`) },
    { path: "public/visual/journal-cover.svg", content: editorialWorldSvg("Journal", "notes from the shop and the road", "#102033") },
    { path: "public/visual/journal-night-ride.svg", content: editorialWorldSvg("After dark", "checklist · lights · layers", "#101820") },
    { path: "public/visual/journal-shirt.svg", content: editorialWorldSvg("Shirt logic", "weight · print · wash", "#1a1512") },
    { path: "public/visual/journal-bike-night.svg", content: editorialWorldSvg("Bike night", "park once · leave a lane", "#14181f") },
    { path: "public/visual/journal-garage.svg", content: editorialWorldSvg("Garage hour", "light · time · stay", "#12100e") },
    { path: "public/visual/journal-group-ride.svg", content: editorialWorldSvg("Group ride", "sweep · gap · not a race", "#111820") },
    { path: "public/visual/journal-gear.svg", content: editorialWorldSvg("Clothes vs gear", "tee is not armor", "#161820") },
    { path: "public/visual/suggest.svg", content: editorialWorldSvg("Suggest a Design", "bring the hour, not a manufacturer mark", "#2a241c") },
    { path: "public/commerce-artwork/ride-past-midnight.svg", content: CLUB_THROTTLE_CANARY_DESIGN.artwork_svg },
    { path: "public/commerce-artwork/kickstands-up.svg", content: concept.artwork_svg },
  ];

  if (logo.present) {
    files.push({ path: "public/brand/club-throttle/logo-primary.png", content: logo.content, encoding: "base64" });
    files.push({ path: "app/icon.png", content: logo.content, encoding: "base64" });
  }

  return {
    files,
    digest: createHash("sha256").update(files.map((file) => `${file.path}:${file.content}`).sort().join("\n")).digest("hex"),
    logo_bound: logo.present,
    founder_dirty_tree_deployed: false,
  };
}
