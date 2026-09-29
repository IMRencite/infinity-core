import type { ReactNode } from "react";
import styles from "./operations-room.module.css";
import { INFINITY_OS_LOGO_SRC } from "./infinity-os-brand-logo";

export function OperationsHeader({ trailingBrand }: { trailingBrand?: ReactNode }) {
  return (
    <header className={styles.heroHeader}>
      <div className={styles.heroHeaderBody}>
      <p className={styles.heroKicker}>Infinity OS · Autonomous Venture Operations</p>
      <div className={styles.heroLogo} data-infinity-os-hero-logo="true">
        <img src={INFINITY_OS_LOGO_SRC} alt="Infinity OS" width={320} height={82} decoding="async" />
      </div>
      <h1 className={styles.heroTitleVisuallyHidden}>Infinity OS</h1>
      <p className={styles.heroLead}>
        Infinity researches, validates, builds, launches, markets, sells, and operates ventures. This is the public
        observation layer of a continuously running autonomous headquarters.
      </p>
      <p className={styles.privacy}>
        A sanitized live operations view. Private business, customer, provider, and financial data is never exposed.
        The system is always on. This is not the internal HQ.
      </p>
      </div>
      {trailingBrand ? <div className={styles.heroHeaderBrand}>{trailingBrand}</div> : null}
    </header>
  );
}
