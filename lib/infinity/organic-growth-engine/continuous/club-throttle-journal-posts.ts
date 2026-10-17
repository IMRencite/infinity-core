import type { OccupancyNpvBlogPost } from "./occupancynpv-blog-catalog";

export const CLUB_THROTTLE_JOURNAL_ROOT = "/journal/" as const;

function permalink(category: string, slug: string): string {
  return `/journal/${category}/${slug}/`;
}

function article(input: {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  image: string;
  image_alt?: string;
  featured?: boolean;
  tags: string[];
}): OccupancyNpvBlogPost {
  return {
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt,
    path: permalink(input.category, input.slug),
    category: input.category.replace(/-/g, " "),
    primaryCategory: input.category.replace(/-/g, " "),
    tags: input.tags,
    image: input.image,
    image_alt: input.image_alt ?? input.title,
    published: "2026-09-25",
    modified: "2026-09-25",
    reading_time: "9 min",
    featured: input.featured ?? true,
    draft: false,
    unpublished: false,
  };
}

export const CLUB_THROTTLE_JOURNAL_POSTS: OccupancyNpvBlogPost[] = [
  article({
    slug: "how-to-ride-after-dark",
    category: "night-riding",
    title: "How to ride after dark without turning the night into a stunt",
    excerpt:
      "A practical night-ride checklist: light, layers, sight lines, and the mistakes that make late pavement worse than it has to be.",
    image: "/visual/journal-hero-night-ride.webp",
    tags: ["night riding", "checklist", "safety"],
  }),
  article({
    slug: "how-riders-choose-a-shirt",
    category: "apparel",
    title: "How riders choose a shirt that survives the ride home",
    excerpt:
      "Weight, print placement, and wash rules matter more than a slogan. Compare layers before you buy another thin catalog tee.",
    image: "/visual/journal-v2-shirt-hero.webp",
    tags: ["apparel", "layers", "heavyweight"],
  }),
  article({
    slug: "bike-night-etiquette",
    category: "culture",
    title: "Bike-night etiquette that keeps the lot from turning into a show",
    excerpt: "Arrive, park, talk, leave. The rules are social, not a race brief, and they keep a weeknight meet usable.",
    image: "/visual/journal-hero-bike-night.webp",
    tags: ["bike night", "etiquette", "meetup"],
  }),
  article({
    slug: "garage-culture-as-rider-social-life",
    category: "culture",
    title: "Garage culture is rider social life, not a repair-shop costume",
    excerpt: "What a working garage actually is: light, time, and people who stay after the ride. Not a fake outlaw set.",
    image: "/visual/journal-hero-garage.webp",
    tags: ["garage", "culture", "identity"],
  }),
  article({
    slug: "group-ride-etiquette",
    category: "rides",
    title: "Group-ride etiquette for street bikes that are not a race",
    excerpt: "Spacing, signals, fuel stops, and how to leave a group without making the last rider invent a new plan.",
    image: "/visual/journal-hero-group-ride.webp",
    tags: ["group ride", "etiquette", "street"],
  }),
  article({
    slug: "streetwear-vs-riding-gear",
    category: "apparel",
    title: "Streetwear versus riding gear: what a shirt can and cannot do",
    excerpt: "A comparison table for when a heavyweight tee is clothes and when you still need real protective gear.",
    image: "/visual/journal-hero-streetwear-gear.webp",
    tags: ["streetwear", "gear", "comparison"],
  }),
];
