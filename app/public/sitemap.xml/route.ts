import { NextResponse } from "next/server";

const BODY = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>/public/operations-room</loc></url>
  <url><loc>/public/privacy</loc></url>
  <url><loc>/public/terms</loc></url>
</urlset>
`;

export function GET(): NextResponse {
  return new NextResponse(BODY, {
    status: 200,
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
