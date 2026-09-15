import styles from "./operations-room.module.css";

const STEPS = ["Discover", "Validate", "Build", "Launch", "Operate", "Learn"] as const;

export function HowInfinityOperates() {
  return (
    <section className={styles.flow} aria-label="How Infinity operates">
      <h2 className={styles.roomTitle}>How Infinity Operates</h2>
      <p>Infinity discovers opportunities, validates economics, builds products, launches ventures, and operates and learns continuously.</p>
      <div className={styles.stepRow}>
        {STEPS.map((step) => (
          <span key={step} className={styles.step}>
            {step}
          </span>
        ))}
      </div>
    </section>
  );
}
