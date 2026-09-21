import { redirect } from "next/navigation";

export const metadata = { robots: { index: false, follow: true } };

export default function Page() {
  redirect("/commercial-lease-npv/what-discount-rate-should-you-use");
}
