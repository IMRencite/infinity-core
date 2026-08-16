import type { CodingTask } from "../types";

type MockFile = { path: string; operation: "CREATE" | "PATCH"; content: string };

export function buildMockCollectionsChanges(task: CodingTask): MockFile[] {
  if (task.taskType === "IMPLEMENT_DATABASE") {
    return [mockStorePatch()];
  }
  if (task.taskType === "IMPLEMENT_API") {
    return [mockCollectionsRoute(), mockCollectionIdRoute(), mockCollectionItemsRoute()];
  }
  if (task.taskType === "IMPLEMENT_UI") {
    return [mockCollectionPage(), mockDashboardCollections(), mockNavPatch()];
  }
  if (task.taskType === "WRITE_TESTS") {
    return [mockCollectionsTest()];
  }
  return [];
}

function mockStorePatch(): MockFile {
  const snippet = `
export type Collection = {
  id: string;
  creatorId: string;
  slug: string;
  title: string;
  description: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CollectionItem = {
  id: string;
  collectionId: string;
  postId: string;
  addedAt: string;
};
`;
  const helpers = `
export function canUserEditCollection(userId: string, collection: Collection): boolean {
  return collection.creatorId === userId;
}

export function findCollectionBySlug(store: DataStore, creatorId: string, slug: string): Collection | undefined {
  return store.collections.find((c) => c.creatorId === creatorId && c.slug === slug);
}

export function addCollection(store: DataStore, input: Omit<Collection, "id" | "createdAt" | "updatedAt">): Collection {
  const now = new Date().toISOString();
  const record: Collection = { ...input, id: createId("col"), createdAt: now, updatedAt: now };
  store.collections.push(record);
  return record;
}

export function addCollectionItem(store: DataStore, collectionId: string, postId: string): CollectionItem {
  const item: CollectionItem = { id: createId("ci"), collectionId, postId, addedAt: new Date().toISOString() };
  store.collectionItems.push(item);
  return item;
}
`;
  return {
    path: "lib/db/collections.ts",
    operation: "CREATE",
    content: `// Collections domain module\n${snippet}\n${helpers}\nexport { readStore, mutateStore, createId } from "./store";\nimport type { DataStore } from "./store";\n`,
  };
}

function mockCollectionsRoute(): MockFile {
  return {
    path: "app/api/collections/route.ts",
    operation: "CREATE",
    content: `import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/api/helpers";
import { mutateStore, readStore, addCollection } from "@/lib/db/collections";
import type { DataStore } from "@/lib/db/store";

declare module "@/lib/db/store" {
  interface DataStore {
    collections: import("@/lib/db/collections").Collection[];
    collectionItems: import("@/lib/db/collections").CollectionItem[];
  }
}

export async function GET() {
  const store = await readStore();
  const collections = (store as DataStore & { collections?: unknown[] }).collections ?? [];
  return jsonOk({ collections: collections.filter((c: { isPublic: boolean }) => c.isPublic) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "creator") return jsonError("Forbidden", 403);
  const body = (await request.json()) as { title?: string; description?: string; slug?: string; isPublic?: boolean };
  if (!body.title || !body.slug) return jsonError("title and slug required", 400);
  const collection = await mutateStore((store) => {
    const s = store as DataStore & { collections: import("@/lib/db/collections").Collection[] };
    if (!s.collections) s.collections = [];
    return addCollection(s, {
      creatorId: user.id,
      slug: body.slug!,
      title: body.title!,
      description: body.description ?? "",
      isPublic: body.isPublic ?? true,
    });
  });
  return jsonOk({ collection }, 201);
}
`,
  };
}

function mockCollectionIdRoute(): MockFile {
  return {
    path: "app/api/collections/[id]/route.ts",
    operation: "CREATE",
    content: `import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/api/helpers";
import { mutateStore, readStore, canUserEditCollection } from "@/lib/db/collections";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const store = await readStore();
  const collections = (store as { collections?: Array<{ id: string; isPublic: boolean }> }).collections ?? [];
  const collection = collections.find((c) => c.id === id);
  if (!collection || !collection.isPublic) return jsonError("Not found", 404);
  return jsonOk({ collection });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await ctx.params;
  const body = (await request.json()) as { title?: string; description?: string };
  const updated = await mutateStore((store) => {
    const collections = (store as { collections: Array<{ id: string; creatorId: string; title: string; description: string; updatedAt: string }> }).collections ?? [];
    const collection = collections.find((c) => c.id === id);
    if (!collection || !canUserEditCollection(user.id, collection as never)) throw new Error("Forbidden");
    if (body.title) collection.title = body.title;
    if (body.description) collection.description = body.description;
    collection.updatedAt = new Date().toISOString();
    return collection;
  }).catch(() => null);
  if (!updated) return jsonError("Forbidden", 403);
  return jsonOk({ collection: updated });
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await ctx.params;
  await mutateStore((store) => {
    const s = store as { collections: Array<{ id: string; creatorId: string }>; collectionItems: Array<{ collectionId: string }> };
    const collection = s.collections?.find((c) => c.id === id);
    if (!collection || !canUserEditCollection(user.id, collection as never)) throw new Error("Forbidden");
    s.collections = s.collections.filter((c) => c.id !== id);
    s.collectionItems = (s.collectionItems ?? []).filter((i) => i.collectionId !== id);
  }).catch(() => null);
  return jsonOk({ deleted: true });
}
`,
  };
}

function mockCollectionItemsRoute(): MockFile {
  return {
    path: "app/api/collections/[id]/items/route.ts",
    operation: "CREATE",
    content: `import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/api/helpers";
import { mutateStore, readStore, canUserEditCollection, addCollectionItem } from "@/lib/db/collections";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await ctx.params;
  const body = (await request.json()) as { postId?: string };
  if (!body.postId) return jsonError("postId required", 400);
  const item = await mutateStore((store) => {
    const collections = (store as { collections: Array<{ id: string; creatorId: string }> }).collections ?? [];
    const collection = collections.find((c) => c.id === id);
    if (!collection || !canUserEditCollection(user.id, collection as never)) throw new Error("Forbidden");
    return addCollectionItem(store as never, id, body.postId!);
  }).catch(() => null);
  if (!item) return jsonError("Forbidden", 403);
  return jsonOk({ item }, 201);
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await ctx.params;
  const body = (await request.json()) as { postId?: string };
  await mutateStore((store) => {
    const collections = (store as { collections: Array<{ id: string; creatorId: string }> }).collections ?? [];
    const collection = collections.find((c) => c.id === id);
    if (!collection || !canUserEditCollection(user.id, collection as never)) throw new Error("Forbidden");
    const s = store as { collectionItems: Array<{ collectionId: string; postId: string }> };
    s.collectionItems = (s.collectionItems ?? []).filter((i) => !(i.collectionId === id && i.postId === body.postId));
  }).catch(() => null);
  return jsonOk({ removed: true });
}
`,
  };
}

function mockCollectionPage(): MockFile {
  return {
    path: "app/collection/[slug]/page.tsx",
    operation: "CREATE",
    content: `import { readStore } from "@/lib/db/store";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: \`Collection: \${slug}\`, description: "Creator collection" };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await readStore();
  const collections = (store as { collections?: Array<{ slug: string; title: string; description: string; isPublic: boolean }> }).collections ?? [];
  const collection = collections.find((c) => c.slug === slug && c.isPublic);
  if (!collection) return <main><h1>Collection not found</h1></main>;
  return (
    <main>
      <h1>{collection.title}</h1>
      <p>{collection.description}</p>
    </main>
  );
}
`,
  };
}

function mockDashboardCollections(): MockFile {
  return {
    path: "app/dashboard/collections/page.tsx",
    operation: "CREATE",
    content: `import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { readStore } from "@/lib/db/store";

export default async function DashboardCollectionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const store = await readStore();
  const collections = ((store as { collections?: Array<{ creatorId: string; id: string; title: string }> }).collections ?? []).filter((c) => c.creatorId === user.id);
  return (
    <main>
      <h1>My Collections</h1>
      <Link href="/dashboard/collections/new">Create collection</Link>
      <ul>{collections.map((c) => <li key={c.id}>{c.title}</li>)}</ul>
    </main>
  );
}
`,
  };
}

function mockNavPatch(): MockFile {
  return {
    path: "components/SiteNav.collections-link.tsx",
    operation: "CREATE",
    content: `// Patch hint: add Link to /dashboard/collections for creators in SiteNav.tsx`,
  };
}

function mockCollectionsTest(): MockFile {
  return {
    path: "__tests__/marketplace/collections.test.ts",
    operation: "CREATE",
    content: `import { describe, it, expect } from "vitest";
import { canUserEditCollection } from "@/lib/db/collections";

describe("collections", () => {
  it("enforces creator ownership", () => {
    const collection = { id: "c1", creatorId: "u1", slug: "art", title: "Art", description: "", isPublic: true, createdAt: "", updatedAt: "" };
    expect(canUserEditCollection("u1", collection)).toBe(true);
    expect(canUserEditCollection("u2", collection)).toBe(false);
  });
});
`,
  };
}
