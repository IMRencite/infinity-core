import type { HqPrimaryNavItem } from "./items";
import { HQ_PRIMARY_NAV_ITEMS } from "./items";

export function hqNavItemIsActive(pathname: string, item: HqPrimaryNavItem): boolean {
  if (item.visibility !== "visible" || !item.href) return false;
  if (item.href === "/dashboard") return pathname === "/dashboard";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function activeHqNavItems(pathname: string, items: HqPrimaryNavItem[] = HQ_PRIMARY_NAV_ITEMS): HqPrimaryNavItem[] {
  return items.filter((item) => hqNavItemIsActive(pathname, item));
}
