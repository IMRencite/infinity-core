/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: process.cwd() },
  async redirects() {
    return [
      { source: "/blog/how-interest-rates-affect-commercial-property-values", destination: "/blog/valuation/how-interest-rates-affect-commercial-property-values/", statusCode: 301 },
    ];
  },
};
export default nextConfig;
