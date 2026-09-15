import styles from "./operations-room.module.css";

export function PublicDegradedState() {
  return (
    <section className={styles.statusStrip} data-public-degraded="true">
      <h2 className={styles.heroTitle}>Infinity OS</h2>
      <p>Operations are updating.</p>
      <p>Live public activity will resume shortly.</p>
    </section>
  );
}
