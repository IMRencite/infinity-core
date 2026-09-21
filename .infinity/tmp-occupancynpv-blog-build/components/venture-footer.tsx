export function VentureFooter() {
  return (
    <footer className="vg-legal-footer" data-infinity-footer="public" style={{ display: "block", visibility: "visible", opacity: 1 }}>
      <div className="vg-container vg-legal-footer-inner">
        <nav className="vg-legal-nav" aria-label="Legal and venture attribution" data-footer-format="Privacy Policy | Terms of Service | Sitemap | An Infinity OS Venture | By IMR">
          <a href="/privacy-policy/">Privacy Policy</a>
          <span className="vg-legal-sep" aria-hidden="true">|</span>
          <a href="/terms-of-service/">Terms of Service</a>
          <span className="vg-legal-sep" aria-hidden="true">|</span>
          <a href="/sitemap.xml">Sitemap</a>
          <span className="vg-legal-sep" aria-hidden="true">|</span>
          <a href="https://imros.io">An Infinity OS Venture</a>
          <span className="vg-legal-sep" aria-hidden="true">|</span>
          <a href="https://infinitemediaresources.com">By IMR</a>
        </nav>
        <p className="vg-legal-nav"><a href="/early-access">Request Pilot Access</a></p>
        <p className="vg-legal-nav"><a href="/suggest-improvement">Suggest an Improvement</a></p>
      </div>
    </footer>
  );
}
