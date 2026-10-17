import type { ComposedStorefrontFile } from "./club-throttle-storefront-compose.ts";
import { buildClubThrottleStorefrontCommerceCatalog } from "./club-throttle-storefront-commerce-catalog.ts";
import {
  CLUB_THROTTLE_GLOBAL_ANNOUNCEMENT,
  CLUB_THROTTLE_HOME_HERO_SUPPORTING,
  CLUB_THROTTLE_SHOP_HERO_INTRO,
} from "../venture-brand-os/club-throttle-storefront-copy.ts";
import {
  clubThrottleVentureBrandProfile,
  generateAboutPageSource,
} from "../venture-brand-os/venture-brand-os-v1.ts";

export function clubThrottleMarketplaceStorefrontFiles(cwd = process.cwd()): ComposedStorefrontFile[] {
  const catalog = buildClubThrottleStorefrontCommerceCatalog(cwd);
  const catalogJson = JSON.stringify(catalog, null, 2);
  const brandProfile = clubThrottleVentureBrandProfile();
  const aboutPageSource = generateAboutPageSource({ brand: brandProfile });

  return [
    {
      path: "lib/storefront-commerce.ts",
      content: `export const storefrontCatalog = ${catalogJson} as const;
export type StoreProduct = (typeof storefrontCatalog.products)[number];
export function productBySlug(slug: string) {
  return storefrontCatalog.products.find((p) => p.slug === slug) ?? null;
}
export function productsInShopCategory(slug: string) {
  if (slug === "all-tees") return storefrontCatalog.products;
  return storefrontCatalog.products.filter((p) => (p.shop_categories as readonly string[]).includes(slug));
}
export function searchProducts(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return storefrontCatalog.products;
  return storefrontCatalog.products.filter((p) => p.search_blob.includes(q) || p.title.toLowerCase().includes(q));
}
`,
    },
    {
      path: "app/components/cart-badge.tsx",
      content: `"use client";
import { useEffect, useState } from "react";
import { cartItemCount, CT_BAG_UPDATED_EVENT, readCartLines } from "../../lib/cart-storage";
export function CartBadge() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const read = () => setCount(cartItemCount(readCartLines()));
    read();
    window.addEventListener("storage", read);
    window.addEventListener(CT_BAG_UPDATED_EVENT, read);
    window.addEventListener("focus", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener(CT_BAG_UPDATED_EVENT, read);
      window.removeEventListener("focus", read);
    };
  }, []);
  return <span className="cart-badge" aria-label={count > 0 ? \`\${count} items in cart\` : "Cart empty"}>{count > 0 ? count : ""}</span>;
}
`,
    },
    {
      path: "app/components/customer-menu.tsx",
      content: `"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCustomerSessionEmail } from "../../lib/customer-session";

export function CustomerMenu() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    void getCustomerSessionEmail().then(setEmail);
  }, []);
  if (email) {
    return (
      <>
        <Link href="/account">Account</Link>
        <Link href="/account/orders">Orders</Link>
        <Link href="/account/buy-again">Buy again</Link>
      </>
    );
  }
  return (
    <>
      <Link href="/account/login">Account</Link>
      <Link href="/account/orders">Orders</Link>
    </>
  );
}
`,
    },
    {
      path: "app/components/product-card.tsx",
      content: `"use client";
import Link from "next/link";
import { useState } from "react";
import type { StoreProduct } from "../../lib/storefront-commerce";

export function ProductCard({ product }: { product: StoreProduct }) {
  const [hover, setHover] = useState(false);
  const img = hover ? product.hover_image : product.primary_image;
  return (
    <Link className="product-card" href={\`/products/\${product.slug}\`} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="product-card-image"><img src={img} alt={\`\${product.title} on white heavyweight tee\`} /></div>
      <div className="product-card-body">
        <h3>{product.title}</h3>
        <p className="price">\${product.price_usd.toFixed(2)}</p>
        <p className="meta">{product.garment_summary}</p>
        <p className="meta">{product.size_range_label.replace(/-/g, "–")}</p>
        <p className="category-tag">{product.category_labels[0] ?? "Club Throttle"}</p>
      </div>
    </Link>
  );
}
`,
    },
    {
      path: "app/components/shop-browser.tsx",
      content: `"use client";
import { useMemo, useState } from "react";
import { ProductCard } from "./product-card";
import type { StoreProduct } from "../../lib/storefront-commerce";

type Props = {
  products: StoreProduct[];
  categories: readonly { slug: string; name: string }[];
  checkoutSizes: readonly string[];
  initialCategory?: string;
};

export function ShopBrowser({ products, categories, checkoutSizes, initialCategory = "all-tees" }: Props) {
  const [category, setCategory] = useState(initialCategory);
  const [size, setSize] = useState("");
  const [style, setStyle] = useState("");
  const [sort, setSort] = useState("featured");

  const filtered = useMemo(() => {
    let rows = category === "all-tees" ? products : products.filter((p) => (p.shop_categories as readonly string[]).includes(category));
    if (size) rows = rows.filter((p) => (p.checkout_sizes as readonly string[]).includes(size));
    if (style) rows = rows.filter((p) => (p.riding_style as readonly string[]).includes(style));
    if (sort === "price-asc") rows = [...rows].sort((a, b) => a.price_usd - b.price_usd);
    else if (sort === "price-desc") rows = [...rows].sort((a, b) => b.price_usd - a.price_usd);
    else if (sort === "name") rows = [...rows].sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "newest") rows = [...rows].sort((a, b) => b.released_at.localeCompare(a.released_at));
    return rows;
  }, [products, category, size, style, sort]);

  return (
    <div className="shop-layout" data-commerce-shop-surface>
      <aside className="filters" aria-label="Filters">
        <h2>Filter</h2>
        <label>Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <label>Size
          <select value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="">Any</option>
            {checkoutSizes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>Riding style
          <select value={style} onChange={(e) => setStyle(e.target.value)}>
            <option value="">Any</option>
            <option value="sport">Sport & Track</option>
            <option value="adventure">Adventure</option>
            <option value="garage">Garage</option>
            <option value="street">Street & Night</option>
            <option value="cruiser">Cruiser</option>
          </select>
        </label>
        <p className="filter-note">Price: \${products[0]?.price_usd.toFixed(2)} · all tees</p>
      </aside>
      <div className="shop-main">
        <div className="shop-toolbar">
          <p>{filtered.length} product{filtered.length === 1 ? "" : "s"}</p>
          <label>Sort
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>
        <div className="product-grid">{filtered.map((p) => <ProductCard key={p.slug} product={p} />)}</div>
      </div>
    </div>
  );
}
`,
    },
    {
      path: "app/shop/page.tsx",
      content: `import Link from "next/link";
import { storefrontCatalog } from "../../lib/storefront-commerce";
import { ShopBrowser } from "../components/shop-browser";

export const metadata = { title: "Shop · Club Throttle", alternates: { canonical: "https://clubthrottle.com/shop" } };

export default function ShopPage() {
  const cats = storefrontCatalog.shop_categories.filter((c) => c.slug !== "all-tees");
  return (
    <div className="commerce-shell">
      <section className="shop-hero compact">
        <p className="kicker">Club Throttle Originals</p>
        <h1>Built for people who actually ride.</h1>
        <p>${CLUB_THROTTLE_SHOP_HERO_INTRO}</p>
        <Link className="cta" href="#products">Shop all tees</Link>
      </section>
      <section className="band shop-commerce-band" id="products">
        <ShopBrowser products={[...storefrontCatalog.products]} categories={storefrontCatalog.shop_categories} checkoutSizes={storefrontCatalog.products[0]?.checkout_sizes ?? []} />
      </section>
      <section className="category-row band">
        <h2>Shop by riding style</h2>
        <div className="category-grid">
          {cats.map((cat) => (
            <Link key={cat.slug} className="category-card" href={\`/shop/\${cat.slug}\`}>
              <img src={storefrontCatalog.category_images[cat.slug] ?? storefrontCatalog.products[0]?.primary_image} alt={cat.name} />
              <div className="pad"><strong>{cat.name}</strong><p>{cat.blurb}</p></div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
`,
    },
    {
      path: "app/shop/[category]/page.tsx",
      content: `import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { storefrontCatalog } from "../../../lib/storefront-commerce";
import { ShopBrowser } from "../../components/shop-browser";

export function generateStaticParams() {
  return storefrontCatalog.shop_categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const cat = storefrontCatalog.shop_categories.find((c) => c.slug === category);
  if (!cat) return { title: "Shop · Club Throttle" };
  return {
    title: \`\${cat.name} · Shop · Club Throttle\`,
    description: cat.blurb,
    alternates: { canonical: \`https://clubthrottle.com/shop/\${category}\` },
  };
}

export default async function ShopCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cat = storefrontCatalog.shop_categories.find((c) => c.slug === category);
  if (!cat) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: cat.name,
    description: cat.blurb,
    url: \`https://clubthrottle.com/shop/\${category}\`,
  };
  return (
    <div className="commerce-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="shop-hero compact">
        <p className="kicker"><Link href="/shop">Shop</Link></p>
        <h1>{cat.headline}</h1>
        <p>{cat.blurb}</p>
      </section>
      <section className="band shop-commerce-band">
        <ShopBrowser products={[...storefrontCatalog.products]} categories={storefrontCatalog.shop_categories} checkoutSizes={storefrontCatalog.products[0]?.checkout_sizes ?? []} initialCategory={category} />
      </section>
    </div>
  );
}
`,
    },
    {
      path: "app/globals-commerce.css",
      content: `.commerce-shell{width:min(calc(100vw - max(1.5rem,2vw)),112rem);max-width:min(calc(100vw - max(1.5rem,2vw)),112rem);margin:0 auto;padding:0 clamp(.75rem,1.25vw,1.75rem) 3rem;box-sizing:border-box}
.marketplace-page-gutter{width:min(calc(100vw - max(1.5rem,2vw)),112rem);max-width:min(calc(100vw - max(1.5rem,2vw)),112rem);margin-inline:auto;padding-inline:clamp(1rem,2vw,1.75rem);box-sizing:border-box}
.shop-commerce-band{padding:1rem 0 2rem;width:100%;max-width:none;margin:0}
.shop-hero,.shop-commerce-band,.shop-layout{max-width:none;width:100%}
.home-retail-banner{margin:0;border-bottom:1px solid #e4ddd3;background:linear-gradient(135deg,#1a1816 0%,#2a241c 55%,#1f1c18 100%);color:var(--paper);padding:1.25rem 0}
.home-retail-banner-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:1rem;align-items:center;min-height:0;max-height:20rem}
.home-product-fold,.home-section-band{padding:1rem 0 1.35rem;border-bottom:1px solid #e4ddd3}
.home-retail-banner h1{font-size:clamp(1.35rem,3.2vw,2.15rem);line-height:1.05;margin:.35rem 0 .65rem;letter-spacing:-.03em}
.home-retail-banner p{max-width:36rem;color:#e8e2d8;margin:0 0 .85rem;font-size:.95rem}
.home-retail-banner .cta-row{display:flex;flex-wrap:wrap;gap:.65rem}
.home-retail-banner .cta.secondary{background:transparent;border:1px solid #6a6258;color:var(--paper)}
.home-retail-banner img{width:100%;max-height:18rem;object-fit:contain;background:#f3f1ed;border:1px solid #3a3530}
.home-product-fold h2,.home-section-band h2{font-size:1.05rem;text-transform:uppercase;letter-spacing:.08em;margin:0 0 .75rem}
.color-swatches{display:flex;flex-wrap:wrap;gap:.55rem;margin:.65rem 0 1rem;align-items:center}
.color-swatch-btn{display:inline-flex;align-items:center;gap:.45rem;padding:.35rem .55rem;border:1px solid #d8d0c6;background:var(--paper);cursor:pointer;font-size:.82rem}
.color-swatch-btn.active{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}
.color-swatch-dot{width:1.15rem;height:1.15rem;border-radius:999px;border:1px solid #bbb;flex-shrink:0}
.color-swatch-btn:disabled{opacity:.45;cursor:not-allowed}
.color-single-line{font-size:.92rem;color:var(--charcoal);margin:.35rem 0 .75rem}
.pdp-shell{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(18rem,.95fr);gap:clamp(1.25rem,2.5vw,2.5rem);align-items:start;width:min(calc(100vw - max(1.5rem,2vw)),112rem);max-width:min(calc(100vw - max(1.5rem,2vw)),112rem);margin:0 auto;padding:1.25rem clamp(.75rem,1.25vw,1.75rem) 2rem;box-sizing:border-box}
.pdp-media-col{min-width:0}
.pdp-media-viewport{max-height:min(72vh,44rem);display:flex;align-items:center;justify-content:center;background:#f7f5f1;border:1px solid #e4ddd3;padding:.5rem}
.pdp-media-viewport .garment{width:100%;max-height:min(72vh,44rem);object-fit:contain}
.pdp-purchase-col{position:sticky;top:1rem;align-self:start;max-width:28rem}
.pdp-purchase-col .buy{background:var(--canvas);border:1px solid #e4ddd3;box-sizing:border-box;margin:0}
.pdp-purchase-inner{padding:clamp(1.15rem,2vw,1.65rem) clamp(1.25rem,2.5vw,2rem);box-sizing:border-box}
.pdp-group-identity{margin:0 0 1rem}
.pdp-group-facts{margin:0 0 1rem}
.pdp-group-options{margin:0 0 1rem}
.pdp-group-purchase{display:flex;flex-direction:column;gap:.65rem;margin:0 0 1rem}
.pdp-group-support{margin:0}
.pdp-purchase-inner .size-tiles,.pdp-purchase-inner .cta,.pdp-purchase-inner .pdp-qty-row{width:100%;max-width:100%;box-sizing:border-box}
.pdp-purchase-inner .cta{display:block;text-align:center;width:100%}
.pdp-purchase-inner h1{font-size:clamp(1.35rem,2.2vw,1.85rem);line-height:1.15;margin:.25rem 0 .45rem}
.pdp-purchase-inner .note{font-size:.85rem;color:var(--muted);margin:.35rem 0 0;line-height:1.45}
.pdp-qty-row{display:flex;align-items:center;justify-content:space-between;gap:.75rem;font-size:.92rem}
.pdp-qty-controls{display:inline-flex;align-items:center;gap:.35rem}
.pdp-qty-controls button{padding:.35rem .65rem;border:1px solid #d8d0c6;background:var(--paper);cursor:pointer}
.cart-page{max-width:52rem;margin:0 auto;padding:1.25rem 0 2.5rem}
.cart-line{display:grid;grid-template-columns:7.5rem minmax(0,1fr);gap:1rem;padding:1rem 0;border-bottom:1px solid #ece6dc;align-items:start}
.cart-line img{width:100%;aspect-ratio:3/4;object-fit:contain;background:#f7f5f1;border:1px solid #e4ddd3}
.cart-line-actions{display:flex;flex-wrap:wrap;gap:.65rem;align-items:center;margin-top:.5rem;font-size:.88rem}
.cart-summary{margin:1.25rem 0;padding-top:1rem;border-top:1px solid #e4ddd3}
.customer-util{display:flex;align-items:center;gap:.85rem;font-size:.86rem}
.customer-util a{color:var(--charcoal);text-decoration:none}
.customer-util a:hover{text-decoration:underline}
.account-shell{max-width:42rem;margin:0 auto;padding:1.25rem 0 2.5rem}
.account-list{list-style:none;padding:0;margin:1rem 0}
.account-list li{padding:.65rem 0;border-bottom:1px solid #ece6dc}
@media(max-width:900px){.pdp-purchase-inner{padding:1rem 1.125rem}}
@media(max-width:900px){.pdp-shell{grid-template-columns:1fr;padding-inline:clamp(1rem,4vw,1.25rem)}.pdp-purchase-col{position:static;max-width:none}}
.hero{display:grid!important;grid-template-columns:1fr!important;min-height:0!important;max-height:none!important}
.hero-copy{padding:0!important;background:transparent!important;color:inherit!important}
.shop-hero{display:grid;grid-template-columns:1fr;gap:1rem;padding:1.25rem 0 1.15rem;border-bottom:1px solid #e4ddd3;max-width:100%}
.shop-hero.compact{padding:1rem 0 1rem}
.shop-hero h1{font-size:clamp(1.65rem,2.8vw,2.35rem);margin:.2rem 0 .5rem;letter-spacing:-.03em;max-width:48rem}
.shop-hero p{max-width:42rem}
.category-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:1rem}
.category-card{display:block;background:var(--canvas);border:1px solid #e4ddd3;overflow:hidden}
.category-card img{width:100%;aspect-ratio:4/3;object-fit:cover;background:#f7f5f1}
.shop-layout{display:grid;grid-template-columns:minmax(14.375rem,15.625rem) minmax(0,1fr);gap:clamp(1.5rem,2vw,2rem);align-items:start;width:100%}
.filters{background:var(--canvas);border:1px solid #e4ddd3;padding:1rem 1.05rem;position:sticky;top:.5rem;width:100%;box-sizing:border-box}
.filters h2{font-size:.95rem;margin:0 0 .5rem;text-transform:uppercase;letter-spacing:.06em}
.filters label{display:block;margin:.65rem 0;font-size:.88rem}
.filters select{width:100%;padding:.45rem;border:1px solid #d8d0c6}
.shop-main{min-width:0;width:100%}
.shop-toolbar{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1rem;padding-bottom:.65rem;border-bottom:1px solid #ece6dc;font-size:.92rem;width:100%}
.shop-toolbar label{display:inline-flex;align-items:center;gap:.45rem;margin:0}
.product-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(.85rem,1.4vw,1.35rem);width:100%}
.product-grid.compact{grid-template-columns:repeat(auto-fit,minmax(13rem,1fr))}
.product-card{display:flex;flex-direction:column;background:var(--canvas);border:1px solid #e4ddd3;min-height:100%}
.product-card-image{background:#f7f5f1;aspect-ratio:3/4;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:.35rem}
.product-card-image img{width:100%;height:100%;object-fit:contain;max-height:100%}
.product-card-body{padding:.85rem .95rem 1rem;display:grid;gap:.25rem}
.product-card-body h3{font-size:1rem;margin:0;line-height:1.25}
.product-card-body .price{font-weight:700;font-size:1.05rem;margin:0}
.product-card-body .meta{font-size:.82rem;color:var(--muted);margin:0}
.product-card-body .category-tag{font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);margin:.35rem 0 0}
.cart-badge{display:inline-flex;min-width:1.25rem;height:1.25rem;align-items:center;justify-content:center;background:var(--accent);color:#fff;border-radius:999px;font-size:.72rem;padding:0 .35rem;margin-left:.25rem}
.mast-actions{display:flex;align-items:center;gap:1rem}
.size-tiles{display:flex;flex-wrap:wrap;gap:.45rem;margin:.5rem 0}
.size-tile{padding:.55rem .85rem;border:1px solid #d8d0c6;background:var(--paper);cursor:pointer;font-size:.88rem}
.size-tile.active{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}
.size-tile:disabled{opacity:.45;cursor:not-allowed}
.pdp-gallery{display:grid;gap:.75rem}
.pdp-thumb{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.5rem}
.pdp-thumb button{border:1px solid #e4ddd3;padding:0;background:#f7f5f1;cursor:pointer}
.pdp-thumb img{width:100%;aspect-ratio:1;object-fit:contain}
@media(min-width:1280px){.commerce-shell{width:min(calc(100vw - max(2rem,2.5vw)),112rem);max-width:min(calc(100vw - max(2rem,2.5vw)),112rem)}}
@media(min-width:1600px){.commerce-shell{width:min(calc(100vw - max(2rem,2.75vw)),114rem);max-width:min(calc(100vw - max(2rem,2.75vw)),114rem);padding-inline:clamp(.85rem,1.5vw,1.75rem)}}
@media(min-width:1800px){.commerce-shell{width:min(calc(100vw - max(2.5rem,3vw)),115rem);max-width:min(calc(100vw - max(2.5rem,3vw)),115rem);padding-inline:clamp(.75rem,1.25vw,1.5rem)}}
@media(max-width:1279px) and (min-width:1024px){.shop-layout{grid-template-columns:12.5rem minmax(0,1fr)}.product-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:1100px){.product-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:800px){.shop-layout{grid-template-columns:1fr}.filters{position:static}.product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:1023px) and (min-width:768px){.product-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:640px){.home-retail-banner-grid{grid-template-columns:1fr;max-height:10.5rem;padding:.25rem 0 .85rem}.home-retail-banner h1{font-size:1.25rem;margin-bottom:.45rem}.home-retail-banner p{font-size:.88rem;margin-bottom:.55rem}.home-retail-banner-grid>img{display:none}}
@media(min-width:1280px){.marketplace-page-gutter{padding-inline:clamp(1rem,2.25vw,2rem)}}
@media(max-width:480px){.marketplace-page-gutter{padding-inline:clamp(1rem,4vw,1.25rem)}}
@media(max-width:480px){.product-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}.product-card-body h3{font-size:.88rem}}
.about-page{padding-top:1rem;padding-bottom:2.5rem}
.about-hero{padding:1.25rem 0 1.5rem;border-bottom:1px solid #e4ddd3}
.about-hero h1{font-size:clamp(1.75rem,3vw,2.5rem);letter-spacing:-.03em;margin:.35rem 0 .75rem;max-width:48rem}
.about-hero p{max-width:42rem;color:var(--charcoal)}
.about-split{display:grid;grid-template-columns:1.1fr .9fr;gap:1.5rem;padding:1.5rem 0;align-items:start;border-bottom:1px solid #e4ddd3}
.about-split img{width:100%;object-fit:contain;background:#f7f5f1;border:1px solid #e4ddd3}
.about-band{padding:1.35rem 0;border-bottom:1px solid #ece6dc;max-width:48rem}
.about-band h2{font-size:1.05rem;text-transform:uppercase;letter-spacing:.06em;margin:0 0 .5rem}
.about-cta-row{display:flex;flex-wrap:wrap;gap:.65rem;padding:1.5rem 0}
.about-cta-row .cta.secondary{background:transparent;border:1px solid #d8d0c6;color:var(--ink)}
@media(max-width:800px){.about-split{grid-template-columns:1fr}}
`,
    },
    {
      path: "app/about/page.tsx",
      content: aboutPageSource,
    },
    {
      path: "app/layout.tsx",
      content: `import type { Metadata } from "next";
import "./globals.css";
import "./globals-commerce.css";
import { StoreHeader } from "./components/header";
import { StoreFooter } from "./components/footer";
import { CartContinuityShell } from "./components/cart-continuity-shell";
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
    <html lang="en" data-ct-storefront-version="marketplace-v2">
      <body>
        <div className="shell" data-venture="club-throttle" data-ct-storefront-version="marketplace-v2">
          <StoreHeader />
          <main>{children}</main>
          <StoreFooter />
          <CartContinuityShell />
        </div>
      </body>
    </html>
  );
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
import { CartBadge } from "./cart-badge";
import { CustomerMenu } from "./customer-menu";

const CATS = [
  ["/shop", "Shop"],
  ["/shop/all-tees", "New"],
  ["/shop/all-tees", "All Tees"],
  ["/shop/sport-track", "Sport & Track"],
  ["/shop/adventure-dualsport", "Adventure"],
  ["/shop/garage-culture", "Garage"],
  ["/shop/bagger-cruiser", "Bagger & Cruiser"],
  ["/journal", "Journal"],
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
      <div className="util">${CLUB_THROTTLE_GLOBAL_ANNOUNCEMENT}</div>
      <div className="mast">
        <Link href="/" aria-label="Club Throttle"><BrandMark /></Link>
        <form onSubmit={onSearch}><input className="search" name="q" placeholder="Search Club Throttle gear" aria-label="Search Club Throttle gear" /></form>
        <div className="mast-actions customer-util">
          <CustomerMenu />
          <Link className="cart-link" href="/cart">Cart <CartBadge /></Link>
        </div>
      </div>
      <nav className="cats">{CATS.map(([href, label]) => <Link key={\`\${href}-\${label}\`} href={href}>{label}</Link>)}</nav>
    </>
  );
}
`,
    },
    {
      path: "app/page.tsx",
      content: `import Link from "next/link";
import { storefrontCatalog } from "../lib/storefront-commerce";
import { ProductCard } from "./components/product-card";

export const metadata = { alternates: { canonical: "https://clubthrottle.com" } };

export default function HomePage() {
  const featured = storefrontCatalog.products.slice(0, 4);
  const cats = storefrontCatalog.shop_categories.filter((c) => c.slug !== "all-tees");
  return (
    <>
      <section className="home-retail-banner">
        <div className="marketplace-page-gutter home-retail-banner-grid">
          <div>
            <p className="kicker">Club Throttle Originals</p>
            <h1>Built for people who actually ride.</h1>
            <p>${CLUB_THROTTLE_HOME_HERO_SUPPORTING}</p>
            <div className="cta-row">
              <Link className="cta" href="/shop/all-tees">Shop all tees</Link>
              <Link className="cta secondary" href="#new-releases">New releases</Link>
            </div>
          </div>
          <img src={featured[0]?.primary_image ?? featured[1]?.primary_image} alt="Club Throttle tee merchandise" />
        </div>
      </section>
      <section className="home-product-fold" id="new-releases">
        <div className="marketplace-page-gutter">
          <h2>New releases</h2>
          <div className="product-grid">{featured.map((p) => <ProductCard key={p.slug} product={p} />)}</div>
        </div>
      </section>
      <section className="home-section-band">
        <div className="marketplace-page-gutter">
          <h2>Shop by riding style</h2>
          <div className="category-grid">
            {cats.map((cat) => (
              <Link key={cat.slug} className="category-card" href={\`/shop/\${cat.slug}\`}>
                <img src={storefrontCatalog.category_images[cat.slug] ?? featured[0]?.primary_image} alt={cat.name} />
                <div className="pad"><strong>{cat.name}</strong><p>{cat.blurb}</p></div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="home-section-band">
        <div className="marketplace-page-gutter">
          <h2>Journal</h2>
          <p>Riding culture, gear notes, and what Club Throttle is for — without rewriting the road.</p>
          <Link className="cta" href="/journal">Read the journal</Link>
        </div>
      </section>
    </>
  );
}
`,
    },
    {
      path: "app/api/health/route.ts",
      content: `import { NextResponse } from "next/server";
import { CLUB_THROTTLE_STOREFRONT_BUILD } from "../../../lib/storefront-build-fingerprint";
import { resolveClubThrottleStorefrontCommerceHealth } from "../../../lib/commerce-health";

export async function GET() {
  const commerce = resolveClubThrottleStorefrontCommerceHealth();
  return NextResponse.json({
    ok: true,
    venture: CLUB_THROTTLE_STOREFRONT_BUILD.venture,
    storefront_version: CLUB_THROTTLE_STOREFRONT_BUILD.storefront_version,
    compose_digest: CLUB_THROTTLE_STOREFRONT_BUILD.compose_digest,
    build_commit: CLUB_THROTTLE_STOREFRONT_BUILD.build_commit,
    deployment_id: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    ...commerce,
    automatic_tax_env_enabled: process.env.CLUB_THROTTLE_STRIPE_AUTOMATIC_TAX === "ENABLED",
    PRODUCTION_AUTOMATIC_TAX_ENV_RUNTIME_QC:
      process.env.CLUB_THROTTLE_STRIPE_AUTOMATIC_TAX === "ENABLED" ? "PASS" : "FAIL",
  }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
`,
    },
    {
      path: "app/collections/page.tsx",
      content: `import { redirect } from "next/navigation";
export default function LegacyCollectionsIndex() {
  redirect("/shop");
}
`,
    },
    {
      path: "app/collections/[slug]/page.tsx",
      content: `import { redirect } from "next/navigation";
export default async function LegacyCollectionPage() {
  redirect("/shop/all-tees");
}
`,
    },
    {
      path: "app/search/page.tsx",
      content: `import Link from "next/link";
import { ProductCard } from "../components/product-card";
import { searchProducts, storefrontCatalog } from "../../lib/storefront-commerce";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const hits = searchProducts(q);
  return (
    <div className="commerce-shell">
      <h1>Search</h1>
      <p>{hits.length} result{hits.length === 1 ? "" : "s"}{q ? \` for “\${q}”\` : ""}.</p>
      <div className="product-grid">{hits.map((p) => <ProductCard key={p.slug} product={p} />)}</div>
      {!hits.length && q ? <p><Link href="/shop">Browse all tees</Link></p> : null}
      {!q ? <p className="note">Try sportbike, garage, dual sport, night, bagger, or a product name.</p> : null}
    </div>
  );
}
`,
    },
  ];
}
