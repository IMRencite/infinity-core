import { NextResponse } from "next/server";
import { submitAffiliateApplication } from "@/lib/infinity/affiliate-referral/apply";

export async function POST(request: Request) {
  const body = await request.json() as {
    name?: string;
    email?: string;
    organization?: string;
    website?: string;
    social_url?: string;
    audience?: string;
    promotion_method?: string;
    country?: string;
    agreement_accepted?: boolean;
    production?: boolean;
  };
  const result = submitAffiliateApplication({
    name: body.name ?? "",
    email: body.email ?? "",
    organization: body.organization,
    website: body.website,
    social_url: body.social_url,
    audience: body.audience,
    promotion_method: body.promotion_method,
    country: body.country,
    agreement_accepted: Boolean(body.agreement_accepted),
    production: Boolean(body.production),
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
