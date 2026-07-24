export function slugifyAssetName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "asset";
}

export function buildSourceEntityReference(
  sourceEntityType?: string | null,
  sourceEntityId?: string | null,
): string | null {
  if (!sourceEntityType || !sourceEntityId) {
    return null;
  }

  return `${sourceEntityType}:${sourceEntityId}`;
}

export async function buildUniqueAssetSlug(
  existingSlugs: Set<string>,
  name: string,
): Promise<string> {
  const base = slugifyAssetName(name);

  if (!existingSlugs.has(base)) {
    return base;
  }

  for (let index = 2; index <= 100; index += 1) {
    const candidate = `${base}-${index}`;
    if (!existingSlugs.has(candidate)) {
      return candidate;
    }
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}
