import styles from "./imr-brand-mark.module.css";

export const IMR_BRAND_MARK_SRC = "/brand/imr-mark.png";

export function ImrBrandMark() {
  return (
    <a
      href="/"
      className={styles.brandMark}
      data-imr-brand-mark="true"
      data-section-contained-brand="true"
      data-brand-scroll-behavior="scroll-with-section"
      aria-label="IMR"
      title="IMR"
    >
      <img
        src={IMR_BRAND_MARK_SRC}
        alt="IMR"
        width={28}
        height={28}
        decoding="async"
      />
    </a>
  );
}
