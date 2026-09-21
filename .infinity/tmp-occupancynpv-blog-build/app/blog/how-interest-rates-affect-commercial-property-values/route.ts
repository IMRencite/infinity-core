import { NextResponse } from "next/server";

export function GET(request: Request) {
  return NextResponse.redirect(new URL("/blog/valuation/how-interest-rates-affect-commercial-property-values/", request.url), 301);
}

export function HEAD(request: Request) {
  return GET(request);
}
