export function GET() {
  const launched = process.env.ASKREVIEW_PUBLICLY_LAUNCHED === "1";
  if (!launched) {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
      headers: {
        "Content-Type": "application/xml",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>/askreview</loc></url>
  <url><loc>/askreview/privacy-policy/</loc></url>
  <url><loc>/askreview/terms-of-service/</loc></url>
  <url><loc>/askreview/app/login</loc></url>
</urlset>`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
}
