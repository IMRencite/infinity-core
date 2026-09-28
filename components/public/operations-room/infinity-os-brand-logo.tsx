export const INFINITY_OS_LOGO_SRC = "/brand/infinity-os-logo.png";

export { ImrBrandMark, IMR_BRAND_MARK_SRC } from "./imr-brand-mark";

/** Hero / inline Infinity OS wordmark (transparent PNG). Top-right mark uses {@link ImrBrandMark}. */
export function InfinityOsBrandLogo(props: { className?: string }) {
  return (
    <img
      src={INFINITY_OS_LOGO_SRC}
      alt="Infinity OS"
      width={320}
      height={82}
      decoding="async"
      className={props.className}
      data-infinity-os-brand-logo="true"
    />
  );
}
