import styles from "./operations-room.module.css";

const STEPS = ["Discover", "Validate", "Build", "Launch", "Grow", "Sell", "Learn", "Improve"] as const;

export function HowInfinityOperates() {
  return (
    <section className={styles.flow} aria-label="How Infinity operates">
      <h2 className={styles.roomTitle}>How Infinity Operates</h2>
      <p>Infinity continuously researches, validates, builds, launches, markets, sells, and operates ventures. This page is the public observation layer of that loop.</p>
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
