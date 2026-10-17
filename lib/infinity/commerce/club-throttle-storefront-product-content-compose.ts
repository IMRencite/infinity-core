import type { ComposedStorefrontFile } from "./club-throttle-storefront-compose.ts";
import { CLUB_THROTTLE_PRODUCT_CONTENT_PROFILES } from "./club-throttle-product-content-profiles-v1.ts";
import { CLUB_THROTTLE_SHARED_GARMENT_FACTS } from "./club-throttle-shared-garment-profile-v1.ts";

/** Serializes venture product content profiles into the composed Club Throttle storefront. */
export function clubThrottleProductContentStorefrontFiles(): ComposedStorefrontFile[] {
  return [
    {
      path: "lib/product-content-profiles.ts",
      content: `export type ProductFaqItem = { question: string; answer: string };
export type ProductContentProfile = {
  slug: string;
  sku: string;
  canonical_product_name: string;
  product_type: string;
  design_name: string;
  product_summary: string;
  design_story: string;
  design_visual_elements: string[];
  design_theme: string;
  target_customer: string;
  primary_use_cases: string[];
  benefits: string[];
  differentiators: string[];
  colorway_notes: string;
  where_to_wear: string[];
  care: string;
  structured_facts: Record<string, string>;
  faq: ProductFaqItem[];
  related_product_slugs: string[];
  related_editorial_paths: string[];
  related_collection_slug: string;
};

export const sharedGarmentFacts = ${JSON.stringify(CLUB_THROTTLE_SHARED_GARMENT_FACTS, null, 2)} as const;

export const productContentProfiles = ${JSON.stringify(
        CLUB_THROTTLE_PRODUCT_CONTENT_PROFILES.map((row) => ({
          slug: row.slug,
          sku: row.sku,
          canonical_product_name: row.canonical_product_name,
          product_type: row.product_type,
          design_name: row.design_name,
          product_summary: row.product_summary,
          design_story: row.design_story,
          design_visual_elements: row.design_visual_elements,
          design_theme: row.design_theme,
          target_customer: row.target_customer,
          primary_use_cases: row.primary_use_cases,
          benefits: row.benefits,
          differentiators: row.differentiators,
          colorway_notes: row.colorway_notes,
          where_to_wear: row.where_to_wear,
          care: row.care,
          structured_facts: row.structured_facts,
          faq: row.faq,
          related_product_slugs: row.related_product_slugs,
          related_editorial_paths: row.related_editorial_paths,
          related_collection_slug: row.related_collection_slug,
        })),
        null,
        2,
      )} as const satisfies readonly ProductContentProfile[];

export function contentProfileBySlug(slug: string): ProductContentProfile | null {
  return productContentProfiles.find((row) => row.slug === slug) ?? null;
}
`,
    },
    {
      path: "app/products/[slug]/product-detail-rich-content.tsx",
      content: `import Link from "next/link";
import type { ProductContentProfile } from "../../../lib/product-content-profiles";
import { sharedGarmentFacts } from "../../../lib/product-content-profiles";

type SizeRow = { size_name: string; body_width: string | number; body_length: string | number };
type RelatedProduct = { slug: string; title: string; price_usd: number; primary_image: string };

export function ProductDetailRichContent({
  profile,
  sizes,
  shipping,
  returns,
  checkoutSizes,
  relatedProducts,
}: {
  profile: ProductContentProfile;
  sizes: readonly SizeRow[];
  shipping: string;
  returns: string;
  checkoutSizes: readonly string[];
  relatedProducts: readonly RelatedProduct[];
}) {
  return (
    <div className="sheet pdp-rich" data-product-content-depth="premium-v1">
      <p className="kicker">{profile.product_type} · Club Throttle</p>
      <section aria-labelledby="pdp-summary">
        <h2 id="pdp-summary">About {profile.canonical_product_name}</h2>
        <p>{profile.product_summary}</p>
      </section>
      <section aria-labelledby="pdp-design-story">
        <h2 id="pdp-design-story">Design story — {profile.design_name}</h2>
        <p>{profile.design_story}</p>
        <h3>Visual elements</h3>
        <ul>
          {profile.design_visual_elements.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p>
          <strong>Theme:</strong> {profile.design_theme}
        </p>
      </section>
      <section aria-labelledby="pdp-garment">
        <h2 id="pdp-garment">Garment & print details</h2>
        <p>{sharedGarmentFacts.name} — {sharedGarmentFacts.materials}, {sharedGarmentFacts.fabric_weight}.</p>
        <ul>
          <li>{sharedGarmentFacts.construction}</li>
          <li>Neckline: {sharedGarmentFacts.neckline}</li>
          <li>Sleeve: {sharedGarmentFacts.sleeve}</li>
          <li>Fit: {sharedGarmentFacts.fit}</li>
          <li>Print: {sharedGarmentFacts.print_method}</li>
          <li data-variant-metadata-sync="product-details-color">Color shown in the purchase panel above reflects your selection.</li>
          <li>Sizes available for this product: {checkoutSizes.join(", ")}</li>
        </ul>
        <p>{profile.colorway_notes}</p>
      </section>
      <section aria-labelledby="pdp-why">
        <h2 id="pdp-why">Why riders wear it</h2>
        <p>{profile.target_customer}</p>
        <ul>
          {profile.benefits.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <h3>What makes this design different</h3>
        <ul>
          {profile.differentiators.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="pdp-wear">
        <h2 id="pdp-wear">Where to wear it</h2>
        <ul>
          {profile.where_to_wear.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="note">Lifestyle cotton tee — not crash-protective riding gear.</p>
      </section>
      <section aria-labelledby="size-guide">
        <h2 id="size-guide">Fit & sizing</h2>
        <p>Classic unisex heavy cotton — compare to a favorite tee. Measurements below are garment specs, not body measurements.</p>
        <table>
          <thead>
            <tr>
              <th>Size</th>
              <th>Chest width</th>
              <th>Body length</th>
            </tr>
          </thead>
          <tbody>
            {sizes.map((row) => (
              <tr key={row.size_name}>
                <td>{row.size_name}</td>
                <td>{String(row.body_width)}&quot;</td>
                <td>{String(row.body_length)}&quot;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section aria-labelledby="pdp-care">
        <h2 id="pdp-care">Care</h2>
        <p>{profile.care}</p>
      </section>
      <section aria-labelledby="pdp-facts">
        <h2 id="pdp-facts">Product facts</h2>
        <dl className="fact-grid">
          {Object.entries(profile.structured_facts).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-labelledby="pdp-faq">
        <h2 id="pdp-faq">Questions before you order</h2>
        {profile.faq.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </section>
      <section aria-labelledby="pdp-related">
        <h2 id="pdp-related">Related gear</h2>
        <div className="product-grid compact">
          {relatedProducts.map((p) => (
            <Link key={p.slug} className="product-card" href={\`/products/\${p.slug}\`}>
              <div className="product-card-image">
                <img src={p.primary_image} alt={\`\${p.title} — Club Throttle motorcycle tee\`} />
              </div>
              <div className="product-card-body">
                <h3>{p.title}</h3>
                <p className="price">\${p.price_usd.toFixed(2)}</p>
              </div>
            </Link>
          ))}
        </div>
        <nav className="related-inline" aria-label="Discover more">
          <Link href={\`/collections/\${profile.related_collection_slug}\`}>Shop the {profile.related_collection_slug.replace(/-/g, " ")} collection</Link>
          <Link href="/shop">All motorcycle tees</Link>
          {profile.related_editorial_paths.map((href) => (
            <Link key={href} href={href}>
              Journal
            </Link>
          ))}
          <Link href="/journal">Club Throttle Journal</Link>
        </nav>
      </section>
      <section aria-labelledby="pdp-shipping">
        <h2 id="pdp-shipping">Shipping</h2>
        <p>{shipping}</p>
        <h2 id="pdp-returns">Returns</h2>
        <p>{returns}</p>
      </section>
    </div>
  );
}
`,
    },
  ];
}
