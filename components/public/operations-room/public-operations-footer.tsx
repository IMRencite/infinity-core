import styles from "./operations-room.module.css";

export function PublicOperationsFooter() {
  return (
    <footer className={styles.footer} data-infinity-footer="public" data-footer-format="Privacy Policy | Terms of Service | Sitemap | An Infinity OS Venture | By IMR">
      <nav className={styles.footerNav} aria-label="Legal and attribution">
        <a href="/public/privacy">Privacy Policy</a>
        <span aria-hidden="true">|</span>
        <a href="/public/terms">Terms of Service</a>
        <span aria-hidden="true">|</span>
        <a href="/public/sitemap.xml">Sitemap</a>
        <span aria-hidden="true">|</span>
        <span>An Infinity OS Venture</span>
        <span aria-hidden="true">|</span>
        <a href="https://infinitemediaresources.com" rel="noreferrer" target="_blank">
          By IMR
        </a>
      </nav>
      <p className={styles.privacy}>
        Live activity is intentionally abstracted. Private venture, customer, financial, and infrastructure data is never
        displayed.
      </p>
    </footer>
  );
}
