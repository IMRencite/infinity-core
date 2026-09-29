import { INFINITY_OS_LOGO_SRC } from "./infinity-os-brand-logo";

const ORIGIN = "https://imros.io";

export function PublicBrandSchema() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${ORIGIN}/#organization`,
        name: "Infinite Media Resources",
        alternateName: "IMR",
        url: "https://infinitemediaresources.com",
        logo: `${ORIGIN}${INFINITY_OS_LOGO_SRC}`,
      },
      {
        "@type": "WebSite",
        "@id": `${ORIGIN}/#website`,
        url: ORIGIN,
        name: "Infinity OS",
        description:
          "Infinity OS is IMR's autonomous venture operating system. Public activity at imros.io is sanitized and observational.",
        publisher: { "@id": `${ORIGIN}/#organization` },
        inLanguage: "en-US",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${ORIGIN}/#software`,
        name: "Infinity OS",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: ORIGIN,
        image: `${ORIGIN}${INFINITY_OS_LOGO_SRC}`,
        author: { "@id": `${ORIGIN}/#organization` },
        publisher: { "@id": `${ORIGIN}/#organization` },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/OnlineOnly",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      data-infinity-os-brand-schema="true"
    />
  );
}
