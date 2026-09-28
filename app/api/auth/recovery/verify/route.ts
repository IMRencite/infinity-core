import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  token_hash?: string;
  code?: string;
  type?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (body.type !== "recovery") {
    return NextResponse.json({ ok: false, error: "invalid_type" }, { status: 400 });
  }

  const tokenHash = body.token_hash?.trim();
  const code = body.code?.trim();
  if (!tokenHash && !code) {
    return NextResponse.json({ ok: false, error: "missing_credential" }, { status: 400 });
  }

  const supabase = await createClient();

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (error) {
      return NextResponse.json({ ok: false, error: "verify_failed" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, method: "token_hash" });
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code!);
  if (error) {
    return NextResponse.json({ ok: false, error: "verify_failed" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, method: "code" });
}
