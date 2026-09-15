import styles from "./operations-room.module.css";

export function OperationsHeader() {
  return (
    <header>
      <p className={styles.heroKicker}>Infinity OS by IMR</p>
      <h1 className={styles.heroTitle}>Infinity OS</h1>
      <p className={styles.heroLead}>
        Autonomous Venture Operations. Observe an autonomous operating system research, build, launch, and operate
        ventures in real time.
      </p>
      <p className={styles.privacy}>
        Infinity continuously operates ventures. This room shows sanitized operational activity. Private business,
        customer, and financial data is never exposed.
      </p>
    </header>
  );
}
