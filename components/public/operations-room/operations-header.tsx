import styles from "./operations-room.module.css";

export function OperationsHeader() {
  return (
    <header>
      <p className={styles.heroKicker}>Infinity OS · Autonomous Venture Operations</p>
      <h1 className={styles.heroTitle}>Infinity OS</h1>
      <p className={styles.heroLead}>
        Infinity researches, validates, builds, launches, markets, sells, and operates ventures. This is the public
        observation layer of a continuously running autonomous headquarters.
      </p>
      <p className={styles.privacy}>
        A sanitized live operations view. Private business, customer, provider, and financial data is never exposed.
        The system is always on. This is not the internal HQ.
      </p>
    </header>
  );
}
