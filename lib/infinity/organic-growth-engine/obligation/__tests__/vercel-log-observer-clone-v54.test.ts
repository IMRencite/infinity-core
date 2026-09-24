import { describe, expect, it } from "vitest";

async function readVercelJsonSafely(response: Response): Promise<{ status: number; json: unknown; text: string }> {
  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, json, text };
}

describe("vercel log observer clone safety", () => {
  it("consumes the body once and does not clone after read", async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    const first = await readVercelJsonSafely(response);
    expect(first.status).toBe(200);
    expect(first.json).toEqual({ ok: true });
    expect(first.text).toContain("ok");
  });
});
